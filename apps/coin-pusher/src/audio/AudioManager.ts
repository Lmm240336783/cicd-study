export class AudioManager {
  private context?: AudioContext;
  private enabled = true;

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  play(type: 'click' | 'coin' | 'win' | 'spin' | 'reel' | 'bomb' | 'magnet' | 'impact' | 'fever' | 'diceShake' | 'diceImpact') {
    if (!this.enabled) return;
    const context = this.getContext();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const settings = this.getTone(type);

    oscillator.type = settings.wave;
    oscillator.frequency.setValueAtTime(settings.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.duration);
    gain.gain.setValueAtTime(settings.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration);
  }

  private getContext() {
    this.context ??= new AudioContext();
    void this.context.resume();
    return this.context;
  }

  private getTone(type: Parameters<AudioManager['play']>[0]) {
    const tones = {
      click: { start: 260, end: 190, duration: 0.06, volume: 0.035, wave: 'square' },
      coin: { start: 780, end: 1180, duration: 0.1, volume: 0.045, wave: 'sine' },
      win: { start: 520, end: 1320, duration: 0.24, volume: 0.06, wave: 'triangle' },
      spin: { start: 190, end: 620, duration: 0.34, volume: 0.05, wave: 'sawtooth' },
      reel: { start: 420, end: 280, duration: 0.08, volume: 0.04, wave: 'square' },
      bomb: { start: 130, end: 38, duration: 0.42, volume: 0.12, wave: 'sawtooth' },
      magnet: { start: 240, end: 880, duration: 0.45, volume: 0.045, wave: 'sine' },
      impact: { start: 100, end: 46, duration: 0.34, volume: 0.1, wave: 'triangle' },
      fever: { start: 330, end: 1520, duration: 0.64, volume: 0.08, wave: 'sawtooth' },
      diceShake: { start: 160, end: 340, duration: 0.16, volume: 0.045, wave: 'sawtooth' },
      diceImpact: { start: 220, end: 70, duration: 0.08, volume: 0.035, wave: 'square' },
    } as const;
    return tones[type];
  }
}
