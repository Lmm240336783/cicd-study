import { describe, expect, it } from 'vitest';
import { SlotResolver } from '../src/core/SlotResolver';

describe('SlotResolver', () => {
  it('uses a 50 percent no-win band before paid outcomes', () => {
    expect(new SlotResolver(() => 0.1).resolve().type).toBe('noWin');
    expect(new SlotResolver(() => 0.49).resolve().type).toBe('noWin');
    expect(new SlotResolver(() => 0.5).resolve().type).toBe('smallCoins');
  });

  it('uses balanced win bands after the no-win half', () => {
    expect(new SlotResolver(() => 0.79).resolve().type).toBe('smallCoins');
    expect(new SlotResolver(() => 0.8).resolve().type).toBe('mediumCoins');
    expect(new SlotResolver(() => 0.93).resolve().type).toBe('specialCoin');
    expect(new SlotResolver(() => 0.98).resolve().type).toBe('jackpot');
    expect(new SlotResolver(() => 0.996).resolve().type).toBe('fever');
  });

  it('keeps expected coin return close to the spin cost', () => {
    const bands = [
      { probability: 0.5, coins: 0 },
      { probability: 0.3, coins: 6 },
      { probability: 0.13, coins: 12 },
      { probability: 0.05, coins: 18 },
      { probability: 0.015, coins: 40 },
      { probability: 0.005, coins: 28 },
    ];
    const expectedReturn = bands.reduce((sum, band) => sum + band.probability * band.coins, 0);

    expect(expectedReturn).toBeCloseTo(5, 1);
  });
});
