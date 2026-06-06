import type { SlotResult } from '../core/SlotResolver';
import { type GameStore } from '../core/GameStore';

type SlotRewardTone = 'normal' | 'hot';

export type SlotRewardPresentation = {
  label: string;
  tone: SlotRewardTone;
  visualCoinCount: number;
};

type SlotRewardBridgeHooks = {
  startFever: () => void;
};

const SPECIAL_COIN_TOAST = {
  bomb: '获得炸弹币',
  magnet: '获得磁铁币',
  multiplier: '获得倍率币',
  giant: '获得巨型币',
} as const;

export class SlotRewardBridge {
  apply(
    result: SlotResult,
    store: GameStore,
    hooks: SlotRewardBridgeHooks,
  ): SlotRewardPresentation {
    store.addCoins(result.coins);
    store.addSpinEnergy(result.spinEnergy);
    if (result.specialCoin) store.addSpecialCoin(result.specialCoin);
    if (result.triggerFever) hooks.startFever();

    return {
      label: this.labelFor(result),
      tone: this.toneFor(result),
      visualCoinCount: result.type === 'jackpot' ? 38 : 16,
    };
  }

  private labelFor(result: SlotResult) {
    if (result.specialCoin) return SPECIAL_COIN_TOAST[result.specialCoin];
    if (result.triggerFever) return '立即进入狂热';
    return `+${result.coins} 金币`;
  }

  private toneFor(result: SlotResult): SlotRewardTone {
    return result.type === 'jackpot' || result.type === 'fever' ? 'hot' : 'normal';
  }
}
