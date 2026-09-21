import type { BoardTile, PropertyConfig, ShopOffer } from '../monopolyTypes';

export const MAX_ROUNDS = 12;
export const START_CASH = 3000;
export const PASS_START_REWARD = 200;
export const JAIL_RELEASE_COST = 150;
export const EVENT_GRACE_MS = 20_000;
export const EVENT_CHECK_INTERVAL_MS = 30_000;
export const EVENT_FORCE_INTERVAL_MS = 60_000;
export const EVENT_TRIGGER_PROBABILITY = 0.35;

export const SHOP_OFFERS: ShopOffer[] = [
  {
    key: 'controlDice',
    label: '控骰卡',
    cost: 180,
    description: '下次掷骰时可直接指定 1 到 6 点。',
  },
  {
    key: 'rentFree',
    label: '免租卡',
    cost: 220,
    description: '经过对手地产时可免掉一次租金。',
  },
  {
    key: 'quickBuild',
    label: '急建卡',
    cost: 160,
    description: '升级时可连续升两级，但仍要支付正常建造款。',
  },
];

export const PROPERTY_CONFIGS: PropertyConfig[] = [
  {
    id: 'a1',
    name: '晨光文具街',
    region: 'A',
    landCost: 300,
    registrationFee: 30,
    buildCosts: [120, 160, 220, 320],
    upgradeRegistrationFee: 20,
    rents: [60, 110, 180, 280, 430],
  },
  {
    id: 'a2',
    name: '早茶里巷',
    region: 'A',
    landCost: 300,
    registrationFee: 30,
    buildCosts: [120, 160, 220, 320],
    upgradeRegistrationFee: 20,
    rents: [60, 110, 180, 280, 430],
  },
  {
    id: 'b1',
    name: '银幕大道',
    region: 'B',
    landCost: 450,
    registrationFee: 45,
    buildCosts: [180, 240, 320, 450],
    upgradeRegistrationFee: 30,
    rents: [90, 160, 250, 390, 580],
  },
  {
    id: 'b2',
    name: '霓虹站前街',
    region: 'B',
    landCost: 450,
    registrationFee: 45,
    buildCosts: [180, 240, 320, 450],
    upgradeRegistrationFee: 30,
    rents: [90, 160, 250, 390, 580],
  },
  {
    id: 'c1',
    name: '剧院金融里',
    region: 'C',
    landCost: 650,
    registrationFee: 65,
    buildCosts: [260, 340, 450, 620],
    upgradeRegistrationFee: 40,
    rents: [130, 230, 360, 540, 800],
  },
  {
    id: 'c2',
    name: '云湾商业街',
    region: 'C',
    landCost: 650,
    registrationFee: 65,
    buildCosts: [260, 340, 450, 620],
    upgradeRegistrationFee: 40,
    rents: [130, 230, 360, 540, 800],
  },
  {
    id: 'd1',
    name: '天际会展心脏',
    region: 'D',
    landCost: 900,
    registrationFee: 90,
    buildCosts: [360, 470, 620, 860],
    upgradeRegistrationFee: 60,
    rents: [180, 320, 500, 760, 1100],
  },
  {
    id: 'd2',
    name: '金湾地标环',
    region: 'D',
    landCost: 900,
    registrationFee: 90,
    buildCosts: [360, 470, 620, 860],
    upgradeRegistrationFee: 60,
    rents: [180, 320, 500, 760, 1100],
  },
];

export const BOARD_TILES: BoardTile[] = [
  { id: 'start', index: 0, name: '起点', kind: 'start', description: '经过或停留可拿到启动资金。' },
  { id: 'tile-a1', index: 1, name: '晨光文具街', kind: 'property', description: '低价铺地，前期滚雪球。', propertyId: 'a1' },
  { id: 'tile-chance-1', index: 2, name: '机会格', kind: 'chance', description: '抽一张即时事件卡。' },
  { id: 'tile-a2', index: 3, name: '早茶里巷', kind: 'property', description: '第二块 A 区地产。', propertyId: 'a2' },
  { id: 'tile-tax', index: 4, name: '税收格', kind: 'tax', description: '支付固定税金。' },
  { id: 'tile-b1', index: 5, name: '银幕大道', kind: 'property', description: '中价区开始拉开租金差。', propertyId: 'b1' },
  { id: 'tile-shop', index: 6, name: '商店格', kind: 'shop', description: '花钱购买一次性道具。' },
  { id: 'tile-b2', index: 7, name: '霓虹站前街', kind: 'property', description: '第二块 B 区地产。', propertyId: 'b2' },
  { id: 'tile-reward', index: 8, name: '随机奖励格', kind: 'reward', description: '获得一笔固定奖励。' },
  { id: 'tile-jail', index: 9, name: '监狱', kind: 'jail', description: '下回合可能被迫停留。' },
  { id: 'tile-c1', index: 10, name: '剧院金融里', kind: 'property', description: '中高价区域开始发力。', propertyId: 'c1' },
  { id: 'tile-chance-2', index: 11, name: '机会格', kind: 'chance', description: '抽一张即时事件卡。' },
  { id: 'tile-c2', index: 12, name: '云湾商业街', kind: 'property', description: '第二块 C 区地产。', propertyId: 'c2' },
  { id: 'tile-bank', index: 13, name: '银行格', kind: 'bank', description: '领取稳健现金回流。' },
  { id: 'tile-d1', index: 14, name: '天际会展心脏', kind: 'property', description: '高价区，风险和收益都大。', propertyId: 'd1' },
  { id: 'tile-maintenance', index: 15, name: '维修费格', kind: 'maintenance', description: '按建筑总等级支付维修费。' },
  { id: 'tile-d2', index: 16, name: '金湾地标环', kind: 'property', description: '第二块 D 区地产。', propertyId: 'd2' },
  { id: 'tile-teleport', index: 17, name: '传送格', kind: 'teleport', description: '随机前后跳转 3 格。' },
  { id: 'tile-chance-3', index: 18, name: '机会格', kind: 'chance', description: '抽一张即时事件卡。' },
  { id: 'tile-holiday', index: 19, name: '假日奖励格', kind: 'reward', description: '拿到一笔节庆补贴。' },
];
