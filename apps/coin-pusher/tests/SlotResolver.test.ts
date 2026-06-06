import { describe, expect, it } from 'vitest';
import { SlotResolver } from '../src/core/SlotResolver';

describe('SlotResolver', () => {
  it('forces a special coin after five non-premium results', () => {
    const resolver = new SlotResolver(() => 0);
    resolver.recordResult('smallCoins');
    resolver.recordResult('smallCoins');
    resolver.recordResult('mediumCoins');
    resolver.recordResult('energy');
    resolver.recordResult('smallCoins');

    expect(resolver.resolve().type).toBe('specialCoin');
  });

  it('uses the configured probability bands', () => {
    expect(new SlotResolver(() => 0.1).resolve().type).toBe('smallCoins');
    expect(new SlotResolver(() => 0.5).resolve().type).toBe('mediumCoins');
    expect(new SlotResolver(() => 0.65).resolve().type).toBe('energy');
    expect(new SlotResolver(() => 0.8).resolve().type).toBe('specialCoin');
    expect(new SlotResolver(() => 0.93).resolve().type).toBe('jackpot');
    expect(new SlotResolver(() => 0.99).resolve().type).toBe('fever');
  });
});
