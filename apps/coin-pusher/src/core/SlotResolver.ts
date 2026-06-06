import type { SpecialCoinType } from './GameStore';

export type SlotResultType =
  | 'smallCoins'
  | 'mediumCoins'
  | 'energy'
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

const randomInt = (random: () => number, min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

export class SlotResolver {
  private missedPremiumResults = 0;

  constructor(private readonly random = Math.random) {}

  recordResult(type: SlotResultType) {
    this.missedPremiumResults =
      type === 'specialCoin' || type === 'jackpot' || type === 'fever'
        ? 0
        : this.missedPremiumResults + 1;
  }

  resolve(): SlotResult {
    if (this.missedPremiumResults >= 5) {
      const result = this.createSpecialCoinResult();
      this.recordResult(result.type);
      return result;
    }

    const roll = this.random();
    let result: SlotResult;
    if (roll < 0.36) {
      result = { type: 'smallCoins', coins: randomInt(this.random, 8, 14), spinEnergy: 0 };
    } else if (roll < 0.58) {
      result = { type: 'mediumCoins', coins: randomInt(this.random, 15, 28), spinEnergy: 0 };
    } else if (roll < 0.72) {
      result = { type: 'energy', coins: 6, spinEnergy: 25 };
    } else if (roll < 0.9) {
      result = this.createSpecialCoinResult();
    } else if (roll < 0.97) {
      result = {
        type: 'jackpot',
        coins: randomInt(this.random, 40, 70),
        spinEnergy: 10,
        specialCoin: this.random() < 0.6 ? this.pickSpecialCoin() : undefined,
      };
    } else {
      result = { type: 'fever', coins: 20, spinEnergy: 0, triggerFever: true };
    }

    this.recordResult(result.type);
    return result;
  }

  private createSpecialCoinResult(): SlotResult {
    return {
      type: 'specialCoin',
      coins: randomInt(this.random, 6, 12),
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
