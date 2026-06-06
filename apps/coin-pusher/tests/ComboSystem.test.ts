import { describe, expect, it } from 'vitest';
import { ComboSystem } from '../src/core/ComboSystem';

describe('ComboSystem', () => {
  it('returns milestone rewards once per combo', () => {
    const combo = new ComboSystem();
    const rewards = Array.from({ length: 30 }, () => combo.registerDrop(0.2));

    expect(rewards.filter((reward) => reward.feverEnergy === 5)).toHaveLength(1);
    expect(rewards.filter((reward) => reward.feverEnergy === 10)).toHaveLength(1);
    expect(rewards.filter((reward) => reward.spins === 1)).toHaveLength(1);
  });

  it('resets after the 1.2 second combo window expires', () => {
    const combo = new ComboSystem();
    combo.registerDrop(0.1);
    combo.update(1.3);

    expect(combo.count).toBe(0);
  });
});
