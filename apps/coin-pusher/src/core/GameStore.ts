export type SpecialCoinType = 'bomb' | 'magnet' | 'multiplier' | 'giant';

export type DropReward = {
  coins: number;
  spinEnergy: number;
  feverEnergy: number;
};

export type GameState = {
  coins: number;
  spins: number;
  spinEnergy: number;
  feverEnergy: number;
  multiplier: number;
  combo: number;
  bestCombo: number;
  feverActive: boolean;
  selectedCoin: 'normal' | SpecialCoinType;
  specialCoins: Record<SpecialCoinType, number>;
};

const initialState = (): GameState => ({
  coins: 80,
  spins: 5,
  spinEnergy: 0,
  feverEnergy: 0,
  multiplier: 1,
  combo: 0,
  bestCombo: Number(readStorage('neon-coin-rush-best-combo') ?? 0),
  feverActive: false,
  selectedCoin: 'normal',
  specialCoins: {
    bomb: 0,
    magnet: 0,
    multiplier: 0,
    giant: 0,
  },
});

const readStorage = (key: string) =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem(key);

const writeStorage = (key: string, value: string) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
};

export class GameStore {
  state = initialState();
  private readonly listeners = new Set<(state: GameState) => void>();

  subscribe(listener: (state: GameState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  addCoins(amount: number) {
    this.state.coins = Math.max(0, this.state.coins + amount);
    this.emit();
  }

  spendCoin() {
    if (this.state.coins < 1) return false;
    this.state.coins -= 1;
    this.emit();
    return true;
  }

  spendSpin() {
    if (this.state.spins < 1) return false;
    this.state.spins -= 1;
    this.emit();
    return true;
  }

  addSpins(amount: number) {
    this.state.spins = Math.max(0, this.state.spins + amount);
    this.emit();
  }

  addSpinEnergy(amount: number) {
    this.state.spinEnergy = Math.max(0, this.state.spinEnergy + amount);
    while (this.state.spinEnergy >= 100) {
      this.state.spinEnergy -= 100;
      this.state.spins += 1;
    }
    this.emit();
  }

  addFeverEnergy(amount: number) {
    this.state.feverEnergy = Math.min(100, Math.max(0, this.state.feverEnergy + amount));
    this.emit();
  }

  consumeFeverEnergy() {
    this.state.feverEnergy = 0;
    this.emit();
  }

  setFeverActive(active: boolean) {
    this.state.feverActive = active;
    this.state.multiplier = active ? Math.max(this.state.multiplier, 2) : 1;
    this.emit();
  }

  setMultiplier(multiplier: number) {
    this.state.multiplier = Math.max(1, multiplier);
    this.emit();
  }

  rewardDrop(reward: DropReward) {
    this.state.coins += reward.coins * this.state.multiplier;
    this.addSpinEnergy(reward.spinEnergy);
    this.addFeverEnergy(reward.feverEnergy);
  }

  addSpecialCoin(type: SpecialCoinType, amount = 1) {
    this.state.specialCoins[type] += amount;
    this.emit();
  }

  consumeSpecialCoin(type: SpecialCoinType) {
    if (this.state.specialCoins[type] < 1) return false;
    this.state.specialCoins[type] -= 1;
    this.state.selectedCoin = 'normal';
    this.emit();
    return true;
  }

  selectCoin(type: GameState['selectedCoin']) {
    if (type !== 'normal' && this.state.specialCoins[type] < 1) return;
    this.state.selectedCoin = type;
    this.emit();
  }

  setCombo(combo: number) {
    this.state.combo = combo;
    if (combo > this.state.bestCombo) {
      this.state.bestCombo = combo;
      writeStorage('neon-coin-rush-best-combo', String(combo));
    }
    this.emit();
  }
}
