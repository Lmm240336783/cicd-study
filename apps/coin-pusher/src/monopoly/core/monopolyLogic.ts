import {
  BOARD_TILES,
  EVENT_CHECK_INTERVAL_MS,
  EVENT_FORCE_INTERVAL_MS,
  EVENT_GRACE_MS,
  EVENT_TRIGGER_PROBABILITY,
  JAIL_RELEASE_COST,
  MAX_ROUNDS,
  PASS_START_REWARD,
  PROPERTY_CONFIGS,
  SHOP_OFFERS,
  START_CASH,
} from './monopolyConfig';
import type {
  BoardTile,
  GlobalEffects,
  MonopolySession,
  PlayerState,
  PropertyState,
  RegionCode,
  ShopOffer,
} from '../monopolyTypes';

type ChanceCard = {
  label: string;
  apply: (session: MonopolySession, player: PlayerState) => string;
};

type TimedEvent = {
  label: string;
  apply: (session: MonopolySession) => string;
};

type UpgradePlan = {
  steps: 1 | 2;
  totalCost: number;
  buildCost: number;
  registrationCost: number;
  usesQuickBuild: boolean;
};

const BOARD_SIZE = BOARD_TILES.length;
const ROUND_EFFECT_DURATION = 2;
const SAFE_TILE_IDS = new Set(['start', 'tile-chance-1', 'tile-chance-2', 'tile-chance-3', 'tile-reward', 'tile-holiday', 'tile-bank']);

function cloneSession(session: MonopolySession) {
  return structuredClone(session);
}

function createInitialEffects(): GlobalEffects {
  return {
    extraStartBonusRounds: 0,
    registrationDiscountRounds: 0,
    rentDiscountRegion: null,
    rentDiscountRounds: 0,
    constructionSurchargeRegion: null,
    constructionSurchargeRounds: 0,
    closedTileId: null,
    closedTileRounds: 0,
  };
}

function createInitialProperties() {
  return Object.fromEntries(
    PROPERTY_CONFIGS.map((config) => [
      config.id,
      {
        config,
        ownerId: null,
        level: 0,
      } satisfies PropertyState,
    ]),
  );
}

function createInitialPlayers() {
  return [
    {
      id: 'human',
      name: '你',
      shortName: '你',
      color: '#ffcf6a',
      isHuman: true,
      position: 0,
      cash: START_CASH,
      skipTurns: 0,
      jailed: false,
      bankrupt: false,
      laps: 0,
      turnsTaken: 0,
      items: {
        controlDice: 1,
        rentFree: 0,
        quickBuild: 0,
      },
    },
    {
      id: 'ai-teal',
      name: '青潮 AI',
      shortName: '青',
      color: '#61f0d6',
      isHuman: false,
      position: 0,
      cash: START_CASH,
      skipTurns: 0,
      jailed: false,
      bankrupt: false,
      laps: 0,
      turnsTaken: 0,
      items: {
        controlDice: 0,
        rentFree: 1,
        quickBuild: 0,
      },
    },
    {
      id: 'ai-rose',
      name: '霓虹 AI',
      shortName: '霓',
      color: '#ff7dc2',
      isHuman: false,
      position: 0,
      cash: START_CASH,
      skipTurns: 0,
      jailed: false,
      bankrupt: false,
      laps: 0,
      turnsTaken: 0,
      items: {
        controlDice: 0,
        rentFree: 0,
        quickBuild: 1,
      },
    },
  ] satisfies PlayerState[];
}

function getCurrentPlayer(session: MonopolySession) {
  return session.players[session.currentPlayerIndex];
}

function getTile(index: number) {
  return BOARD_TILES[index];
}

function appendLog(session: MonopolySession, entry: string) {
  session.logs.unshift(entry);
  session.logs = session.logs.slice(0, 18);
}

function getOwnedPropertyIds(session: MonopolySession, playerId: string) {
  return Object.values(session.properties)
    .filter((property) => property.ownerId === playerId)
    .map((property) => property.config.id);
}

function getBuildingInvestment(property: PropertyState, steps = property.level) {
  return property.config.buildCosts.slice(0, steps).reduce((total, cost) => total + cost, 0);
}

function getPropertyLiquidationValue(property: PropertyState) {
  return Math.round((property.config.landCost + getBuildingInvestment(property)) * 0.6);
}

function getRegionOwnershipBonus(session: MonopolySession, property: PropertyState) {
  const sameRegionCount = Object.values(session.properties).filter(
    (candidate) => candidate.ownerId === property.ownerId && candidate.config.region === property.config.region,
  ).length;
  return sameRegionCount >= 2 ? 1.25 : 1;
}

function getRoundCountText(rounds: number) {
  return rounds > 0 ? `剩余 ${rounds} 轮` : '未生效';
}

function getRegistrationFeeWithEffects(session: MonopolySession, baseRegistrationFee: number) {
  if (session.effects.registrationDiscountRounds > 0) {
    return Math.round(baseRegistrationFee * 0.5);
  }

  return baseRegistrationFee;
}

function getBuildCostWithEffects(session: MonopolySession, property: PropertyState, stepOffset: number) {
  const baseCost = property.config.buildCosts[property.level + stepOffset];
  if (property.config.region === session.effects.constructionSurchargeRegion && session.effects.constructionSurchargeRounds > 0) {
    return Math.round(baseCost * 1.2);
  }

  return baseCost;
}

function getUpgradePlan(session: MonopolySession, propertyId: string, steps: 1 | 2): UpgradePlan | null {
  const property = session.properties[propertyId];
  const nextLevel = property.level + steps;
  if (nextLevel > 4) return null;

  let buildCost = 0;
  let registrationCost = 0;
  for (let offset = 0; offset < steps; offset += 1) {
    buildCost += getBuildCostWithEffects(session, property, offset);
    registrationCost += getRegistrationFeeWithEffects(session, property.config.upgradeRegistrationFee);
  }

  return {
    steps,
    totalCost: buildCost + registrationCost,
    buildCost,
    registrationCost,
    usesQuickBuild: steps === 2,
  };
}

function getRentAmount(session: MonopolySession, propertyId: string) {
  const property = session.properties[propertyId];
  let rent = property.config.rents[property.level];
  rent = Math.round(rent * getRegionOwnershipBonus(session, property));

  if (property.config.region === session.effects.rentDiscountRegion && session.effects.rentDiscountRounds > 0) {
    rent = Math.round(rent * 0.7);
  }

  return rent;
}

function getMaintenanceFeeForPortfolio(session: MonopolySession, playerId: string) {
  return Object.values(session.properties)
    .filter((property) => property.ownerId === playerId)
    .reduce((total, property) => {
      if (property.level === 1) return total + 20;
      if (property.level === 2) return total + 35;
      if (property.level === 3) return total + 55;
      if (property.level === 4) return total + 80;
      return total;
    }, 0);
}

function getMaintenanceFeeForTile(session: MonopolySession, playerId: string) {
  return Object.values(session.properties)
    .filter((property) => property.ownerId === playerId)
    .reduce((total, property) => total + property.level * 30, 0);
}

function getPlayerPropertyValue(session: MonopolySession, playerId: string) {
  return Object.values(session.properties)
    .filter((property) => property.ownerId === playerId)
    .reduce((total, property) => total + property.config.landCost + getBuildingInvestment(property), 0);
}

function countActivePlayers(session: MonopolySession) {
  return session.players.filter((player) => !player.bankrupt).length;
}

function getPlayerById(session: MonopolySession, playerId: string) {
  return session.players.find((player) => player.id === playerId) ?? null;
}

function getPlayerAssetTotal(session: MonopolySession, playerId: string) {
  const player = getPlayerById(session, playerId);
  if (!player) return 0;
  return player.cash + getPlayerPropertyValue(session, playerId);
}

function releasePlayerProperties(session: MonopolySession, playerId: string) {
  Object.values(session.properties).forEach((property) => {
    if (property.ownerId === playerId) {
      property.ownerId = null;
      property.level = 0;
    }
  });
}

function autoRescueFromDebt(session: MonopolySession, player: PlayerState, reason: string) {
  while (player.cash < 0) {
    const properties = Object.values(session.properties)
      .filter((property) => property.ownerId === player.id)
      .sort((left, right) => getPropertyLiquidationValue(right) - getPropertyLiquidationValue(left));

    const property = properties[0];
    if (!property) break;

    const cashBack = getPropertyLiquidationValue(property);
    player.cash += cashBack;
    appendLog(session, `${player.name}卖出 ${property.config.name} 回笼 ${cashBack}。`);
    property.ownerId = null;
    property.level = 0;
  }

  if (player.cash >= 0) return;

  player.cash = 0;
  player.bankrupt = true;
  player.skipTurns = 0;
  player.jailed = false;
  releasePlayerProperties(session, player.id);
  appendLog(session, `${player.name}因${reason}资不抵债，宣布破产。`);
}

function addCash(session: MonopolySession, player: PlayerState, amount: number, reason: string) {
  player.cash += amount;
  appendLog(session, `${player.name}${reason}，资金 ${amount >= 0 ? '+' : ''}${amount}。`);
}

function transferCash(session: MonopolySession, payer: PlayerState, receiver: PlayerState | null, amount: number, reason: string) {
  payer.cash -= amount;
  if (receiver) receiver.cash += amount;

  const receiverText = receiver ? `，支付给 ${receiver.name}` : '';
  appendLog(session, `${payer.name}${reason}，资金 -${amount}${receiverText}。`);
  autoRescueFromDebt(session, payer, reason);
}

function tickRoundEffects(session: MonopolySession) {
  if (session.effects.extraStartBonusRounds > 0) session.effects.extraStartBonusRounds -= 1;
  if (session.effects.registrationDiscountRounds > 0) session.effects.registrationDiscountRounds -= 1;

  if (session.effects.rentDiscountRounds > 0) {
    session.effects.rentDiscountRounds -= 1;
    if (session.effects.rentDiscountRounds === 0) session.effects.rentDiscountRegion = null;
  }

  if (session.effects.constructionSurchargeRounds > 0) {
    session.effects.constructionSurchargeRounds -= 1;
    if (session.effects.constructionSurchargeRounds === 0) session.effects.constructionSurchargeRegion = null;
  }

  if (session.effects.closedTileRounds > 0) {
    session.effects.closedTileRounds -= 1;
    if (session.effects.closedTileRounds === 0) session.effects.closedTileId = null;
  }
}

function finalizeGame(session: MonopolySession, status: string) {
  const ranking = [...session.players].sort((left, right) => {
    return getPlayerAssetTotal(session, right.id) - getPlayerAssetTotal(session, left.id);
  });
  const bestScore = ranking.length > 0 ? getPlayerAssetTotal(session, ranking[0].id) : 0;

  session.winnerIds = ranking.filter((player) => getPlayerAssetTotal(session, player.id) === bestScore).map((player) => player.id);
  session.phase = 'gameOver';
  session.pendingAction = null;
  session.status = status;
  return session;
}

function advanceToNextPlayer(session: MonopolySession, status: string) {
  if (countActivePlayers(session) <= 1) {
    const winner = session.players.find((player) => !player.bankrupt);
    return finalizeGame(session, winner ? `${winner.name} 成为最后留在场上的赢家。` : status);
  }

  session.pendingAction = null;
  session.phase = 'needStart';
  session.status = status;
  session.lastRoll = null;

  let nextIndex = session.currentPlayerIndex;
  let wrapped = false;
  for (let step = 0; step < session.players.length; step += 1) {
    nextIndex = (nextIndex + 1) % session.players.length;
    if (nextIndex === 0) wrapped = true;
    if (!session.players[nextIndex].bankrupt) break;
  }

  session.currentPlayerIndex = nextIndex;

  if (wrapped) {
    session.round += 1;
    tickRoundEffects(session);
    if (session.round > MAX_ROUNDS) {
      return finalizeGame(session, `${MAX_ROUNDS} 轮结束，开始按总资产结算。`);
    }
  }

  return session;
}

function getChanceCards(): ChanceCard[] {
  return [
    {
      label: '投资分红',
      apply: (session, player) => {
        addCash(session, player, 220, '拿到投资分红');
        return `${player.name}拿到 220 的投资分红。`;
      },
    },
    {
      label: '临检罚单',
      apply: (session, player) => {
        transferCash(session, player, null, 140, '收到了临检罚单');
        return `${player.name}支付了 140 的临检罚单。`;
      },
    },
    {
      label: '控骰赞助',
      apply: (session, player) => {
        player.items.controlDice += 1;
        appendLog(session, `${player.name}获得 1 张控骰卡。`);
        return `${player.name}获得 1 张控骰卡。`;
      },
    },
    {
      label: '免租缓冲',
      apply: (session, player) => {
        player.items.rentFree += 1;
        appendLog(session, `${player.name}获得 1 张免租卡。`);
        return `${player.name}获得 1 张免租卡。`;
      },
    },
    {
      label: '急建许可',
      apply: (session, player) => {
        player.items.quickBuild += 1;
        appendLog(session, `${player.name}获得 1 张急建卡。`);
        return `${player.name}获得 1 张急建卡。`;
      },
    },
    {
      label: '即时返现',
      apply: (session, player) => {
        addCash(session, player, 160, '触发了商圈返现');
        return `${player.name}拿到 160 的即时返现。`;
      },
    },
  ];
}

function getTimedEvents(): TimedEvent[] {
  return [
    {
      label: '城市消费节',
      apply: (session) => {
        session.effects.extraStartBonusRounds = ROUND_EFFECT_DURATION;
        return `所有玩家经过起点额外 +100，${getRoundCountText(session.effects.extraStartBonusRounds)}。`;
      },
    },
    {
      label: '建造补贴',
      apply: (session) => {
        session.effects.registrationDiscountRounds = ROUND_EFFECT_DURATION;
        return `升级登记费减半，${getRoundCountText(session.effects.registrationDiscountRounds)}。`;
      },
    },
    {
      label: '幸运抽奖',
      apply: (session) => {
        const candidates = session.players.filter((player) => !player.bankrupt);
        const winner = candidates[Math.floor(Math.random() * candidates.length)];
        addCash(session, winner, 200, '抽中城市幸运奖');
        return `${winner.name}抽中 200 现金奖励。`;
      },
    },
    {
      label: '市政检修',
      apply: (session) => {
        const regions: RegionCode[] = ['A', 'B', 'C', 'D'];
        const region = regions[Math.floor(Math.random() * regions.length)];
        session.effects.rentDiscountRegion = region;
        session.effects.rentDiscountRounds = ROUND_EFFECT_DURATION;
        return `${region} 区租金下调 30%，${getRoundCountText(session.effects.rentDiscountRounds)}。`;
      },
    },
    {
      label: '价格波动',
      apply: (session) => {
        const regions: RegionCode[] = ['A', 'B', 'C', 'D'];
        const region = regions[Math.floor(Math.random() * regions.length)];
        session.effects.constructionSurchargeRegion = region;
        session.effects.constructionSurchargeRounds = ROUND_EFFECT_DURATION;
        return `${region} 区建造成本上浮 20%，${getRoundCountText(session.effects.constructionSurchargeRounds)}。`;
      },
    },
    {
      label: '税务抽查',
      apply: (session) => {
        const ranking = [...session.players]
          .filter((player) => !player.bankrupt)
          .sort((left, right) => getOwnedPropertyIds(session, right.id).length - getOwnedPropertyIds(session, left.id).length);
        const target = ranking[0];
        if (!target) return '没有可抽查的对象。';

        const amount = Object.values(session.properties)
          .filter((property) => property.ownerId === target.id)
          .reduce((total, property) => total + property.level * 25, 0);
        if (amount > 0) {
          transferCash(session, target, null, amount, '接受税务抽查');
        } else {
          appendLog(session, `${target.name}建筑等级较低，本次税务抽查免于处罚。`);
        }

        return amount > 0 ? `${target.name}支付了 ${amount} 的税务抽查费用。` : `${target.name}本次没有额外税费。`;
      },
    },
    {
      label: '临时封路',
      apply: (session) => {
        const candidates = BOARD_TILES.filter((tile) => tile.kind !== 'start' && SAFE_TILE_IDS.has(tile.id) === false);
        const tile = candidates[Math.floor(Math.random() * candidates.length)];
        session.effects.closedTileId = tile.id;
        session.effects.closedTileRounds = 1;
        return `${tile.name} 封路 1 轮，踩上去会被退回前一格。`;
      },
    },
  ];
}

function chooseShopOffers() {
  return SHOP_OFFERS.map((offer) => ({ ...offer }));
}

function maybeAutoUseRentFree(player: PlayerState, rent: number) {
  return player.items.rentFree > 0 && (rent >= 400 || player.cash < rent);
}

function applyOwnershipAction(session: MonopolySession, player: PlayerState, propertyId: string) {
  const property = session.properties[propertyId];
  if (property.ownerId === null) {
    if (player.isHuman) {
      session.pendingAction = { type: 'buy', propertyId };
      session.phase = 'awaitingDecision';
      session.status = `${player.name}可购买 ${property.config.name}。`;
      return session;
    }

    const purchaseCost = property.config.landCost + property.config.registrationFee;
    if (player.cash >= Math.max(900, purchaseCost * 2)) {
      player.cash -= purchaseCost;
      property.ownerId = player.id;
      appendLog(session, `${player.name}买下 ${property.config.name}，支出 ${purchaseCost}。`);
    } else {
      appendLog(session, `${player.name}放弃购买 ${property.config.name}。`);
    }
    return advanceToNextPlayer(session, `${player.name}结束了本回合。`);
  }

  if (property.ownerId === player.id) {
    if (property.level >= 4) {
      appendLog(session, `${player.name}停在 ${property.config.name}，该地已满级。`);
      return advanceToNextPlayer(session, `${player.name}结束了本回合。`);
    }

    const oneLevelPlan = getUpgradePlan(session, propertyId, 1);
    if (!oneLevelPlan || player.cash < oneLevelPlan.totalCost) {
      appendLog(session, `${player.name}资金不足，无法升级 ${property.config.name}。`);
      return advanceToNextPlayer(session, `${player.name}结束了本回合。`);
    }

    if (player.isHuman) {
      session.pendingAction = { type: 'upgrade', propertyId };
      session.phase = 'awaitingDecision';
      session.status = `${player.name}可升级 ${property.config.name}。`;
      return session;
    }

    const twoLevelPlan = player.items.quickBuild > 0 ? getUpgradePlan(session, propertyId, 2) : null;
    const shouldDoubleUpgrade = twoLevelPlan && player.cash >= twoLevelPlan.totalCost + 500;
    if (shouldDoubleUpgrade && twoLevelPlan) {
      player.items.quickBuild -= 1;
      player.cash -= twoLevelPlan.totalCost;
      property.level += 2;
      appendLog(session, `${player.name}使用急建卡，让 ${property.config.name} 连升两级，支出 ${twoLevelPlan.totalCost}。`);
    } else {
      player.cash -= oneLevelPlan.totalCost;
      property.level += 1;
      appendLog(session, `${player.name}升级 ${property.config.name}，支出 ${oneLevelPlan.totalCost}。`);
    }

    return advanceToNextPlayer(session, `${player.name}结束了本回合。`);
  }

  const owner = getPlayerById(session, property.ownerId);
  const rent = getRentAmount(session, propertyId);
  if (player.isHuman && player.items.rentFree > 0) {
    session.pendingAction = { type: 'rent', propertyId, ownerId: property.ownerId, rent };
    session.phase = 'awaitingDecision';
    session.status = `${property.config.name} 需要支付租金 ${rent}。`;
    return session;
  }

  if (maybeAutoUseRentFree(player, rent)) {
    player.items.rentFree -= 1;
    appendLog(session, `${player.name}使用免租卡，免掉了 ${property.config.name} 的租金。`);
    return advanceToNextPlayer(session, `${player.name}免掉租金后结束了本回合。`);
  }

  transferCash(session, player, owner, rent, `支付 ${property.config.name} 的租金`);
  return advanceToNextPlayer(session, `${player.name}支付租金后结束了本回合。`);
}

function resolveChanceTile(session: MonopolySession, player: PlayerState) {
  const cards = getChanceCards();
  const card = cards[Math.floor(Math.random() * cards.length)];
  const summary = card.apply(session, player);
  session.status = `机会事件：${card.label}`;
  appendLog(session, summary);
  return advanceToNextPlayer(session, `${player.name}处理完机会事件。`);
}

function resolveShopTile(session: MonopolySession, player: PlayerState, tile: BoardTile) {
  if (player.isHuman) {
    session.pendingAction = { type: 'shop', tileId: tile.id, offers: chooseShopOffers() };
    session.phase = 'awaitingDecision';
    session.status = `${player.name}来到商店，可购买道具。`;
    return session;
  }

  const affordableOffers = SHOP_OFFERS.filter((offer) => player.cash >= offer.cost + 500);
  const offer = affordableOffers[0];
  if (offer) {
    player.cash -= offer.cost;
    player.items[offer.key] += 1;
    appendLog(session, `${player.name}在商店购买了 ${offer.label}，支出 ${offer.cost}。`);
  } else {
    appendLog(session, `${player.name}逛了商店，但决定先留现金。`);
  }
  return advanceToNextPlayer(session, `${player.name}结束了本回合。`);
}

function resolveTeleportTile(session: MonopolySession, player: PlayerState) {
  const options = [-3, -2, -1, 1, 2, 3].map((offset) => (player.position + offset + BOARD_SIZE) % BOARD_SIZE);
  const safeTargets = options.filter((index) => {
    const tile = getTile(index);
    return SAFE_TILE_IDS.has(tile.id);
  });
  const destinationIndex = safeTargets[Math.floor(Math.random() * safeTargets.length)] ?? options[Math.floor(Math.random() * options.length)];
  const destinationTile = getTile(destinationIndex);
  player.position = destinationIndex;
  appendLog(session, `${player.name}从传送格跳到了 ${destinationTile.name}。`);
  return resolveLanding(session, destinationIndex, false);
}

function resolveLanding(session: MonopolySession, tileIndex: number, allowClosedTileRedirect: boolean) {
  const player = getCurrentPlayer(session);
  const tile = getTile(tileIndex);

  if (allowClosedTileRedirect && session.effects.closedTileId === tile.id) {
    const redirectedIndex = (tileIndex - 1 + BOARD_SIZE) % BOARD_SIZE;
    const redirectedTile = getTile(redirectedIndex);
    player.position = redirectedIndex;
    appendLog(session, `${tile.name} 封路，${player.name}被退回到 ${redirectedTile.name}。`);
    return resolveLanding(session, redirectedIndex, false);
  }

  if (tile.kind === 'start') {
    addCash(session, player, PASS_START_REWARD, '停在起点拿到启动资金');
    return advanceToNextPlayer(session, `${player.name}在起点站稳脚跟。`);
  }

  if (tile.kind === 'property' && tile.propertyId) {
    return applyOwnershipAction(session, player, tile.propertyId);
  }

  if (tile.kind === 'chance') {
    return resolveChanceTile(session, player);
  }

  if (tile.kind === 'shop') {
    return resolveShopTile(session, player, tile);
  }

  if (tile.kind === 'reward') {
    const reward = tile.id === 'tile-holiday' ? 250 : 180;
    addCash(session, player, reward, `停在 ${tile.name}`);
    return advanceToNextPlayer(session, `${player.name}拿到奖励后结束了本回合。`);
  }

  if (tile.kind === 'tax') {
    transferCash(session, player, null, 180, '支付固定税收');
    return advanceToNextPlayer(session, `${player.name}缴税后结束了本回合。`);
  }

  if (tile.kind === 'bank') {
    addCash(session, player, 100, '在银行拿到稳健回流');
    return advanceToNextPlayer(session, `${player.name}在银行补到现金后结束了本回合。`);
  }

  if (tile.kind === 'maintenance') {
    const maintenanceFee = getMaintenanceFeeForTile(session, player.id);
    if (maintenanceFee > 0) {
      transferCash(session, player, null, maintenanceFee, '支付建筑维修费');
    } else {
      appendLog(session, `${player.name}名下暂无建筑，本次维修费为 0。`);
    }
    return advanceToNextPlayer(session, `${player.name}处理维修费后结束了本回合。`);
  }

  if (tile.kind === 'jail') {
    player.skipTurns = 1;
    player.jailed = true;
    appendLog(session, `${player.name}被送进监狱，下回合将停留。`);
    return advanceToNextPlayer(session, `${player.name}被送进监狱。`);
  }

  if (tile.kind === 'teleport') {
    return resolveTeleportTile(session, player);
  }

  return advanceToNextPlayer(session, `${player.name}结束了本回合。`);
}

function addPassStartBonuses(session: MonopolySession, player: PlayerState) {
  const extraReward = session.effects.extraStartBonusRounds > 0 ? 100 : 0;
  const reward = PASS_START_REWARD + extraReward;
  player.laps += 1;
  player.cash += reward;
  appendLog(session, `${player.name}完成第 ${player.laps} 圈，拿到 ${reward} 启动资金。`);

  const maintenance = getMaintenanceFeeForPortfolio(session, player.id);
  if (maintenance > 0) {
    player.cash -= maintenance;
    appendLog(session, `${player.name}因整圈结算支付建筑维护费 ${maintenance}。`);
    autoRescueFromDebt(session, player, '整圈维护费');
  }
}

function getForcedReleaseDecision(player: PlayerState) {
  return !player.isHuman && player.jailed && player.cash >= 800;
}

function isRoundReadyForTimedEvent(session: MonopolySession) {
  return session.phase === 'needStart' && session.pendingAction === null && !session.queuedTimedEvent;
}

export function createMonopolySession(now = Date.now()): MonopolySession {
  return {
    board: BOARD_TILES,
    players: createInitialPlayers(),
    properties: createInitialProperties(),
    currentPlayerIndex: 0,
    round: 1,
    phase: 'needStart',
    pendingAction: null,
    status: '欢迎来到霓虹大富翁，先从你的第一轮开始。',
    lastRoll: null,
    logs: ['新局开始：每位玩家初始资金 3000。'],
    winnerIds: [],
    gameStartedAt: now,
    nextTimedEventCheckAt: now + EVENT_CHECK_INTERVAL_MS,
    lastTimedEventAt: null,
    queuedTimedEvent: false,
    lastTimedEventLabel: null,
    effects: createInitialEffects(),
  };
}

export function getPropertyForTile(session: MonopolySession, tile: BoardTile) {
  return tile.propertyId ? session.properties[tile.propertyId] : null;
}

export function getPurchaseCost(property: PropertyState) {
  return property.config.landCost + property.config.registrationFee;
}

export function getUpgradeOptions(session: MonopolySession, propertyId: string) {
  const oneLevel = getUpgradePlan(session, propertyId, 1);
  const twoLevel = getUpgradePlan(session, propertyId, 2);
  return { oneLevel, twoLevel };
}

export function getRentPreview(session: MonopolySession, propertyId: string) {
  return getRentAmount(session, propertyId);
}

export function getPlayerAssetPreview(session: MonopolySession, playerId: string) {
  return getPlayerAssetTotal(session, playerId);
}

export function getPlayerPropertySummary(session: MonopolySession, playerId: string) {
  return Object.values(session.properties).filter((property) => property.ownerId === playerId);
}

export function prepareMonopolyTurn(session: MonopolySession) {
  if (session.phase !== 'needStart' || session.queuedTimedEvent) return session;

  const next = cloneSession(session);
  const player = getCurrentPlayer(next);
  if (player.bankrupt) {
    return advanceToNextPlayer(next, `${player.name}已破产，跳过其行动。`);
  }

  if (player.skipTurns > 0) {
    if (getForcedReleaseDecision(player)) {
      player.cash -= JAIL_RELEASE_COST;
      player.skipTurns = 0;
      player.jailed = false;
      appendLog(next, `${player.name}支付 ${JAIL_RELEASE_COST} 离开监狱。`);
      next.phase = 'ready';
      next.status = `${player.name}从监狱出来了，准备掷骰。`;
      return next;
    }

    if (player.jailed && player.isHuman && player.cash >= JAIL_RELEASE_COST) {
      next.pendingAction = { type: 'jail', cost: JAIL_RELEASE_COST };
      next.phase = 'awaitingDecision';
      next.status = `${player.name}被困在监狱，可支付 ${JAIL_RELEASE_COST} 立即离开。`;
      return next;
    }

    player.skipTurns -= 1;
    if (player.skipTurns === 0) player.jailed = false;
    appendLog(next, `${player.name}本回合停留。`);
    return advanceToNextPlayer(next, `${player.name}本回合停留。`);
  }

  next.phase = 'ready';
  next.status = `第 ${next.round} 轮，轮到 ${player.name} 掷骰。`;
  return next;
}

export function rollMonopolyTurn(session: MonopolySession, roll: number, useControlledDice: boolean) {
  if (session.phase !== 'ready') return session;

  const next = cloneSession(session);
  const player = getCurrentPlayer(next);
  player.turnsTaken += 1;
  next.lastRoll = roll;

  if (useControlledDice && player.items.controlDice > 0) {
    player.items.controlDice -= 1;
    appendLog(next, `${player.name}使用控骰卡，指定本次掷出 ${roll} 点。`);
  } else {
    appendLog(next, `${player.name}自然掷出 ${roll} 点。`);
  }

  const previousPosition = player.position;
  const nextPosition = (player.position + roll) % BOARD_SIZE;
  player.position = nextPosition;
  if (nextPosition < previousPosition) {
    addPassStartBonuses(next, player);
  }

  const tile = getTile(nextPosition);
  next.status = `${player.name}落在 ${tile.name}。`;
  return resolveLanding(next, nextPosition, true);
}

export function resolveBuyDecision(session: MonopolySession, accept: boolean) {
  if (session.pendingAction?.type !== 'buy') return session;

  const next = cloneSession(session);
  const player = getCurrentPlayer(next);
  const property = next.properties[next.pendingAction.propertyId];
  if (accept) {
    const purchaseCost = getPurchaseCost(property);
    if (player.cash >= purchaseCost) {
      player.cash -= purchaseCost;
      property.ownerId = player.id;
      appendLog(next, `${player.name}买下 ${property.config.name}，支出 ${purchaseCost}。`);
    } else {
      appendLog(next, `${player.name}想买 ${property.config.name}，但现金不足。`);
    }
  } else {
    appendLog(next, `${player.name}放弃购买 ${property.config.name}。`);
  }

  return advanceToNextPlayer(next, `${player.name}结束了本回合。`);
}

export function resolveUpgradeDecision(session: MonopolySession, mode: 'skip' | 'single' | 'double') {
  if (session.pendingAction?.type !== 'upgrade') return session;

  const next = cloneSession(session);
  const player = getCurrentPlayer(next);
  const propertyId = next.pendingAction.propertyId;
  const property = next.properties[propertyId];

  if (mode === 'skip') {
    appendLog(next, `${player.name}放弃升级 ${property.config.name}。`);
    return advanceToNextPlayer(next, `${player.name}结束了本回合。`);
  }

  const plan = mode === 'double' ? getUpgradePlan(next, propertyId, 2) : getUpgradePlan(next, propertyId, 1);
  if (!plan) {
    appendLog(next, `${property.config.name}已无法继续升级。`);
    return advanceToNextPlayer(next, `${player.name}结束了本回合。`);
  }

  if (plan.usesQuickBuild) {
    if (player.items.quickBuild <= 0) {
      appendLog(next, `${player.name}没有急建卡，无法连升两级。`);
      return advanceToNextPlayer(next, `${player.name}结束了本回合。`);
    }
    player.items.quickBuild -= 1;
  }

  if (player.cash >= plan.totalCost) {
    player.cash -= plan.totalCost;
    property.level += plan.steps;
    appendLog(next, `${player.name}升级 ${property.config.name} ${plan.steps} 级，支出 ${plan.totalCost}。`);
  } else {
    appendLog(next, `${player.name}现金不足，未能升级 ${property.config.name}。`);
  }

  return advanceToNextPlayer(next, `${player.name}结束了本回合。`);
}

export function resolveRentDecision(session: MonopolySession, useCard: boolean) {
  if (session.pendingAction?.type !== 'rent') return session;

  const next = cloneSession(session);
  const player = getCurrentPlayer(next);
  const { ownerId, propertyId, rent } = next.pendingAction;
  const property = next.properties[propertyId];

  if (useCard && player.items.rentFree > 0) {
    player.items.rentFree -= 1;
    appendLog(next, `${player.name}使用免租卡，免掉了 ${property.config.name} 的租金。`);
    return advanceToNextPlayer(next, `${player.name}免掉租金后结束了本回合。`);
  }

  const owner = getPlayerById(next, ownerId);
  transferCash(next, player, owner, rent, `支付 ${property.config.name} 的租金`);
  return advanceToNextPlayer(next, `${player.name}支付租金后结束了本回合。`);
}

export function resolveShopDecision(session: MonopolySession, offerKey: ShopOffer['key'] | null) {
  if (session.pendingAction?.type !== 'shop') return session;

  const next = cloneSession(session);
  const player = getCurrentPlayer(next);
  if (!offerKey) {
    appendLog(next, `${player.name}逛完商店，决定不购物。`);
    return advanceToNextPlayer(next, `${player.name}结束了本回合。`);
  }

  const offer = SHOP_OFFERS.find((candidate) => candidate.key === offerKey);
  if (!offer) {
    appendLog(next, `${player.name}选择了无效的商店道具。`);
    return advanceToNextPlayer(next, `${player.name}结束了本回合。`);
  }

  if (player.cash >= offer.cost) {
    player.cash -= offer.cost;
    player.items[offer.key] += 1;
    appendLog(next, `${player.name}购买了 ${offer.label}，支出 ${offer.cost}。`);
  } else {
    appendLog(next, `${player.name}现金不足，没能买下 ${offer.label}。`);
  }

  return advanceToNextPlayer(next, `${player.name}结束了本回合。`);
}

export function resolveJailDecision(session: MonopolySession, payToLeave: boolean) {
  if (session.pendingAction?.type !== 'jail') return session;

  const next = cloneSession(session);
  const player = getCurrentPlayer(next);
  if (payToLeave && player.cash >= next.pendingAction.cost) {
    player.cash -= next.pendingAction.cost;
    player.skipTurns = 0;
    player.jailed = false;
    next.pendingAction = null;
    next.phase = 'ready';
    appendLog(next, `${player.name}支付 ${next.pendingAction?.cost ?? JAIL_RELEASE_COST} 离开监狱。`);
    next.status = `${player.name}已经离开监狱，可以掷骰。`;
    return next;
  }

  player.skipTurns = Math.max(0, player.skipTurns - 1);
  player.jailed = false;
  appendLog(next, `${player.name}选择继续停留。`);
  return advanceToNextPlayer(next, `${player.name}本回合继续停留。`);
}

export function evaluateTimedEventCheck(session: MonopolySession, now: number, roll = Math.random()) {
  if (session.phase === 'gameOver' || session.queuedTimedEvent) return null;
  if (now < session.gameStartedAt + EVENT_GRACE_MS) return null;
  if (now < session.nextTimedEventCheckAt) return null;

  const elapsedSinceLastEvent = session.lastTimedEventAt === null ? now - session.gameStartedAt : now - session.lastTimedEventAt;
  const shouldQueue = elapsedSinceLastEvent >= EVENT_FORCE_INTERVAL_MS || roll < EVENT_TRIGGER_PROBABILITY;

  return {
    nextTimedEventCheckAt: session.nextTimedEventCheckAt + EVENT_CHECK_INTERVAL_MS,
    shouldQueue,
  };
}

export function queueTimedEvent(session: MonopolySession, now: number, roll = Math.random()) {
  const decision = evaluateTimedEventCheck(session, now, roll);
  if (!decision) return session;

  const next = cloneSession(session);
  next.nextTimedEventCheckAt = decision.nextTimedEventCheckAt;
  if (decision.shouldQueue) {
    next.queuedTimedEvent = true;
    appendLog(next, '城市广播：新的全局事件正在靠近，将在本回合结算后生效。');
  }

  return next;
}

export function applyQueuedTimedEvent(session: MonopolySession, now = Date.now()) {
  if (!session.queuedTimedEvent || session.phase === 'gameOver') return session;
  if (!isRoundReadyForTimedEvent(session)) return session;

  const next = cloneSession(session);
  next.queuedTimedEvent = false;
  next.lastTimedEventAt = now;

  const events = getTimedEvents();
  const event = events[Math.floor(Math.random() * events.length)];
  const summary = event.apply(next);
  next.lastTimedEventLabel = event.label;
  appendLog(next, `全局事件 ${event.label}：${summary}`);
  next.status = `全局事件：${event.label}`;

  return next;
}

export function getAiControlledRoll(session: MonopolySession) {
  const player = getCurrentPlayer(session);
  if (player.items.controlDice <= 0) return null;

  const evaluations = Array.from({ length: 6 }, (_, index) => index + 1).map((candidate) => {
    const targetIndex = (player.position + candidate) % BOARD_SIZE;
    const tile = getTile(targetIndex);
    let score = 0;

    if (tile.kind === 'property' && tile.propertyId) {
      const property = session.properties[tile.propertyId];
      if (property.ownerId === null) score += 7;
      if (property.ownerId === player.id) score += 5;
      if (property.ownerId && property.ownerId !== player.id) score -= getRentAmount(session, tile.propertyId) / 50;
    }

    if (tile.kind === 'reward' || tile.kind === 'bank') score += 4;
    if (tile.kind === 'tax' || tile.kind === 'maintenance' || tile.kind === 'jail') score -= 3;

    return { candidate, score };
  });

  const best = evaluations.sort((left, right) => right.score - left.score)[0];
  return best.score >= 5 ? best.candidate : null;
}

export function getMonopolyBoardGrid() {
  return [
    0, 1, 2, 3, 4, 5,
    19, -1, -1, -1, -1, 6,
    18, -1, -1, -1, -1, 7,
    17, -1, -1, -1, -1, 8,
    16, -1, -1, -1, -1, 9,
    15, 14, 13, 12, 11, 10,
  ];
}
