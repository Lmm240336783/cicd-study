import { describe, expect, it } from 'vitest';
import { GameStore } from '../src/core/GameStore';

describe('GameStore', () => {
  it('converts each complete spin energy bar into a spin', () => {
    const store = new GameStore();

    store.addSpinEnergy(245);

    expect(store.state.spins).toBe(7);
    expect(store.state.spinEnergy).toBe(45);
  });

  it('applies coin multipliers without multiplying energy rewards', () => {
    const store = new GameStore();
    store.setMultiplier(3);

    store.rewardDrop({ coins: 1, spinEnergy: 2, feverEnergy: 1 });

    expect(store.state.coins).toBe(83);
    expect(store.state.spinEnergy).toBe(2);
    expect(store.state.feverEnergy).toBe(1);
  });

  it('only consumes an available special coin', () => {
    const store = new GameStore();
    store.addSpecialCoin('bomb', 1);

    expect(store.consumeSpecialCoin('bomb')).toBe(true);
    expect(store.consumeSpecialCoin('bomb')).toBe(false);
  });
});
