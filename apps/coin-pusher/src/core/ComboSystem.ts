export type ComboReward = {
  feverEnergy?: number;
  spins?: number;
  coinRain?: boolean;
};

export class ComboSystem {
  count = 0;
  private remainingWindow = 0;
  private readonly grantedMilestones = new Set<number>();

  registerDrop(windowSeconds = 1.2): ComboReward {
    if (this.remainingWindow <= 0) {
      this.count = 0;
      this.grantedMilestones.clear();
    }
    this.count += 1;
    this.remainingWindow = windowSeconds;

    if (this.count === 10 && !this.grantedMilestones.has(10)) {
      this.grantedMilestones.add(10);
      return { feverEnergy: 5 };
    }
    if (this.count === 20 && !this.grantedMilestones.has(20)) {
      this.grantedMilestones.add(20);
      return { feverEnergy: 10, coinRain: true };
    }
    if (this.count === 30 && !this.grantedMilestones.has(30)) {
      this.grantedMilestones.add(30);
      return { spins: 1 };
    }
    return {};
  }

  update(deltaSeconds: number) {
    if (this.remainingWindow <= 0) return false;
    this.remainingWindow -= deltaSeconds;
    if (this.remainingWindow > 0) return false;
    this.remainingWindow = 0;
    this.count = 0;
    this.grantedMilestones.clear();
    return true;
  }
}
