import type { SpecialCoinType } from './GameStore';

export type SlotResultType =
  | 'noWin'
  | 'smallCoins'
  | 'mediumCoins'
  | 'specialCoin'
  | 'jackpot'
  | 'fever';

export type SlotResult = {
  type: SlotResultType;
  coins: number;
  spinEnergy: number;
  specialCoin?: SpecialCoinType;
  triggerFever?: boolean;
};

export class SlotResolver {
  constructor(private readonly random = Math.random) {}

  recordResult(type?: SlotResultType) {
    void type;
    // Kept as a public hook for older callers; slot odds are now memoryless.
  }

  resolve(): SlotResult {
    const roll = this.random();
    let result: SlotResult;
    if (roll < 0.5) {
      result = { type: 'noWin', coins: 0, spinEnergy: 0 };
    } else if (roll < 0.8) {
      result = { type: 'smallCoins', coins: 6, spinEnergy: 0 };
    } else if (roll < 0.93) {
      result = { type: 'mediumCoins', coins: 12, spinEnergy: 0 };
    } else if (roll < 0.98) {
      result = this.createSpecialCoinResult();
    } else if (roll < 0.995) {
      result = {
        type: 'jackpot',
        coins: 40,
        spinEnergy: 10,
        specialCoin: this.random() < 0.6 ? this.pickSpecialCoin() : undefined,
      };
    } else {
      result = { type: 'fever', coins: 28, spinEnergy: 0, triggerFever: true };
    }

    this.recordResult(result.type);
    return result;
  }

  private createSpecialCoinResult(): SlotResult {
    return {
      type: 'specialCoin',
      coins: 18,
      spinEnergy: 0,
      specialCoin: this.pickSpecialCoin(),
    };
  }

  private pickSpecialCoin(): SpecialCoinType {
    const roll = this.random();
    if (roll < 0.35) return 'bomb';
    if (roll < 0.6) return 'magnet';
    if (roll < 0.85) return 'multiplier';
    return 'giant';
  }
}
