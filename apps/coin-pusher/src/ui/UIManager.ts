import { gsap } from 'gsap';
import type { GameState, SpecialCoinType } from '../core/GameStore';
import type { SlotResult } from '../core/SlotResolver';

type UIHandlers = {
  spin: () => void;
  drop: (lane: number) => void;
  selectCoin: (coin: 'normal' | SpecialCoinType) => void;
  supply: () => void;
  toggleAudio: () => void;
  toggleQuality: () => void;
};

const SLOT_SYMBOLS = ['金币', '星星', '炸弹', '磁铁', '皇冠', '万能'];
const SPECIAL_COIN_LABELS: Record<SpecialCoinType, string> = {
  bomb: '炸弹',
  magnet: '磁铁',
  multiplier: '倍率',
  giant: '巨型',
};

export class UIManager {
  private readonly root: HTMLElement;
  private readonly reels: HTMLElement[];
  private readonly toast: HTMLElement;
  private readonly feverBanner: HTMLElement;
  private readonly supplyButton: HTMLButtonElement;
  private readonly combo: HTMLElement;
  private readonly multiplier: HTMLElement;
  private spinning = false;

  constructor(root: HTMLElement, handlers: UIHandlers) {
    this.root = root;
    this.root.innerHTML = this.template();
    this.reels = Array.from(this.root.querySelectorAll<HTMLElement>('.reel'));
    this.toast = this.root.querySelector<HTMLElement>('#toast')!;
    this.feverBanner = this.root.querySelector<HTMLElement>('#fever-banner')!;
    this.supplyButton = this.root.querySelector<HTMLButtonElement>('#supply')!;
    this.combo = this.root.querySelector<HTMLElement>('#combo')!;
    this.multiplier = this.root.querySelector<HTMLElement>('#multiplier')!;

    this.root.querySelector('#spin')!.addEventListener('click', handlers.spin);
    this.root.querySelector('#supply')!.addEventListener('click', handlers.supply);
    this.root.querySelector('#audio')!.addEventListener('click', handlers.toggleAudio);
    this.root.querySelector('#quality')!.addEventListener('click', handlers.toggleQuality);
    this.root.querySelectorAll<HTMLButtonElement>('[data-lane]').forEach((button) => {
      button.addEventListener('click', () => handlers.drop(Number(button.dataset.lane)));
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-coin]').forEach((button) => {
      button.addEventListener('click', () => {
        handlers.selectCoin(button.dataset.coin as 'normal' | SpecialCoinType);
      });
    });
  }

  render(state: GameState) {
    this.setText('#coins', state.coins.toFixed(0));
    this.setText('#spins', String(state.spins));
    this.setText('#spin-energy-label', `${state.spinEnergy.toFixed(0)}%`);
    this.setText('#fever-energy-label', `${state.feverEnergy.toFixed(0)}%`);
    this.setWidth('#spin-energy-fill', state.spinEnergy);
    this.setWidth('#fever-energy-fill', state.feverEnergy);
    this.setText('#bomb-count', String(state.specialCoins.bomb));
    this.setText('#magnet-count', String(state.specialCoins.magnet));
    this.setText('#multiplier-count', String(state.specialCoins.multiplier));
    this.setText('#giant-count', String(state.specialCoins.giant));
    this.setText('#best-combo', String(state.bestCombo));
    this.root.querySelectorAll('[data-coin]').forEach((button) => {
      button.classList.toggle('active', (button as HTMLElement).dataset.coin === state.selectedCoin);
    });
    (this.root.querySelector<HTMLButtonElement>('#spin')!).disabled = state.spins < 1 || this.spinning;
  }

  setStats(fps: number, physicalCoins: number) {
    this.setText('#fps', `${fps.toFixed(0)} 帧`);
    this.setText('#physical-coins', `${physicalCoins} 物理币`);
  }

  setCombo(value: number) {
    this.combo.textContent = value >= 3 ? `${value} 连击` : '';
    this.combo.classList.toggle('visible', value >= 3);
  }

  showMultiplier(value: number, seconds?: number) {
    this.multiplier.textContent = value > 1 ? `x${value}${seconds ? `  ${Math.ceil(seconds)}秒` : ''}` : '';
    this.multiplier.classList.toggle('visible', value > 1);
  }

  setFever(active: boolean) {
    document.body.classList.toggle('fever', active);
    this.feverBanner.classList.toggle('visible', active);
  }

  showSupply(show: boolean) {
    this.supplyButton.classList.toggle('visible', show);
  }

  showToast(message: string, tone: 'normal' | 'hot' = 'normal') {
    this.toast.textContent = message;
    this.toast.dataset.tone = tone;
    gsap.killTweensOf(this.toast);
    gsap.fromTo(
      this.toast,
      { autoAlpha: 0, y: 16, scale: 0.94 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, yoyo: true, repeat: 1, repeatDelay: 1.05 },
    );
  }

  async animateSlot(result: SlotResult) {
    this.spinning = true;
    (this.root.querySelector<HTMLButtonElement>('#spin')!).disabled = true;
    this.reels.forEach((reel, index) => {
      reel.classList.remove('settled');
      reel.classList.add('rolling');
      window.setTimeout(() => {
        reel.classList.remove('rolling');
        reel.classList.add('settled');
        reel.textContent = this.symbolForResult(result, index);
      }, 700 + index * 220);
    });
    await new Promise((resolve) => window.setTimeout(resolve, 1480));
    this.spinning = false;
  }

  flashLane(lane: number) {
    const button = this.root.querySelector<HTMLElement>(`[data-lane="${lane}"]`)!;
    gsap.fromTo(button, { scale: 0.88 }, { scale: 1, duration: 0.28, ease: 'back.out(2)' });
  }

  // 将内部抽奖结果转成中文图案，避免枚举名直接暴露在游戏界面。
  private symbolForResult(result: SlotResult, index: number) {
    const byType: Record<SlotResult['type'], string> = {
      smallCoins: '金币',
      mediumCoins: index === 1 ? '皇冠' : '金币',
      energy: '星星',
      specialCoin: result.specialCoin ? SPECIAL_COIN_LABELS[result.specialCoin] : '万能',
      jackpot: '皇冠',
      fever: '万能',
    };
    return byType[result.type] ?? SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  }

  private setText(selector: string, value: string) {
    this.root.querySelector<HTMLElement>(selector)!.textContent = value;
  }

  private setWidth(selector: string, value: number) {
    this.root.querySelector<HTMLElement>(selector)!.style.width = `${Math.min(100, value)}%`;
  }

  private template() {
    return `
      <main id="game-shell">
        <div id="canvas-host"></div>
        <header class="hud">
          <div class="brand">
            <strong>霓虹推币机</strong>
            <span>街机推币</span>
          </div>
          <div class="resource primary">
            <span class="resource-label">金币</span>
            <strong id="coins">80</strong>
          </div>
          <div class="energy-block">
            <div class="energy-heading"><span>旋转 <b id="spins">5</b></span><span id="spin-energy-label">0%</span></div>
            <div class="meter"><i id="spin-energy-fill"></i></div>
          </div>
          <div class="energy-block fever-meter">
            <div class="energy-heading"><span>狂热</span><span id="fever-energy-label">0%</span></div>
            <div class="meter"><i id="fever-energy-fill"></i></div>
          </div>
          <div class="hud-actions">
            <button id="audio" class="icon-button" title="切换音效" aria-label="切换音效">♪</button>
            <button id="quality" class="icon-button" title="切换画质" aria-label="切换画质">特效</button>
          </div>
        </header>

        <section class="slot-panel" aria-label="老虎机">
          <div class="slot-topline"><span>幸运连线</span><small>最高连击 <b id="best-combo">0</b></small></div>
          <div class="reels">
            <div class="reel">金币</div>
            <div class="reel">星星</div>
            <div class="reel">皇冠</div>
          </div>
          <button id="spin" class="spin-button"><span>旋转</span><small>消耗 1 次</small></button>
        </section>

        <div class="lane-controls" aria-label="落币口">
          ${Array.from({ length: 5 }, (_, index) => `
            <button class="lane-button" data-lane="${index}" title="落币口 ${index + 1}" aria-label="落币口 ${index + 1}">
              <span>▼</span><small>${index + 1}</small>
            </button>
          `).join('')}
        </div>

        <aside class="stats"><span id="fps">60 帧</span><span id="physical-coins">0 物理币</span></aside>
        <div id="multiplier" class="multiplier"></div>
        <div id="combo" class="combo"></div>
        <div id="fever-banner" class="fever-banner">狂热爆发</div>
        <div id="toast" class="toast"></div>

        <footer class="control-dock">
          <div class="coin-tools">
            <button class="coin-tool normal active" data-coin="normal" title="普通金币">
              <span class="tool-symbol">$</span><small>普通</small>
            </button>
            <button class="coin-tool bomb" data-coin="bomb" title="炸弹币">
              <span class="tool-symbol">炸</span><small>炸弹</small><b id="bomb-count">0</b>
            </button>
            <button class="coin-tool magnet" data-coin="magnet" title="磁铁币">
              <span class="tool-symbol">磁</span><small>磁铁</small><b id="magnet-count">0</b>
            </button>
            <button class="coin-tool multiplier-tool" data-coin="multiplier" title="倍率币">
              <span class="tool-symbol">x2</span><small>倍率</small><b id="multiplier-count">0</b>
            </button>
            <button class="coin-tool giant" data-coin="giant" title="巨型币">
              <span class="tool-symbol">巨</span><small>巨型</small><b id="giant-count">0</b>
            </button>
          </div>
          <button id="supply" class="supply-button">幸运补给 +25</button>
        </footer>
      </main>
    `;
  }
}
