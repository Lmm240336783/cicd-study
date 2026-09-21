import { describe, expect, it } from 'vitest';
import { SlotRoundResolver } from '../src/slot/SlotRound';

describe('SlotRoundResolver', () => {
  it('keeps no-win rounds on a fixed grid without highlighted wins', () => {
    const resolver = new SlotRoundResolver(() => 0);
    const outcome = resolver.resolve({ type: 'noWin', coins: 0, spinEnergy: 0 });

    expect(outcome.grid).toHaveLength(3);
    expect(outcome.grid.every((row) => row.length === 5)).toBe(true);
    expect(outcome.wins).toEqual([]);
    expect(outcome.celebration).toBe('none');
  });

  it('creates a fixed 5x3 grid instead of megaways', () => {
    const resolver = new SlotRoundResolver(() => 0);
    const outcome = resolver.resolve({ type: 'smallCoins', coins: 10, spinEnergy: 0 });

    expect(outcome.grid).toHaveLength(3);
    expect(outcome.grid.every((row) => row.length === 5)).toBe(true);
    expect(outcome.wins[0]?.label).toBe('金币三连');
  });

  it('turns fever into scatter-driven free spins', () => {
    const resolver = new SlotRoundResolver(() => 0.5);
    const outcome = resolver.resolve({ type: 'fever', coins: 20, spinEnergy: 0, triggerFever: true });

    expect(outcome.freeSpinsAwarded).toBe(5);
    expect(outcome.triggerFever).toBe(true);
    expect(outcome.celebration).toBe('fever');
    expect(outcome.grid.flat().filter((symbol) => symbol === 'scatter').length).toBeGreaterThanOrEqual(3);
  });

  it('maps jackpot to a full center-line celebration', () => {
    const resolver = new SlotRoundResolver(() => 0.25);
    const outcome = resolver.resolve({ type: 'jackpot', coins: 60, spinEnergy: 10 });

    expect(outcome.celebration).toBe('jackpot');
    expect(outcome.spinEnergy).toBe(10);
    expect(outcome.wins[0]?.positions).toEqual([
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ]);
  });
});
