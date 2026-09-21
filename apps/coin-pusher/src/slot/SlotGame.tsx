import { useEffect, useRef, useState } from 'react';
import { SlotMachineController } from './SlotMachineController';
import { SlotRoundResolver, type SlotRoundOutcome, type SlotSymbolId } from './SlotRound';
import { SlotSymbol } from './SlotSymbols';

const controller = new SlotMachineController();
const roundResolver = new SlotRoundResolver();
const createPreviewGrid = () => roundResolver.randomGrid();
const SPIN_COST = 5;
const SPIN_ANIMATION_MS = 1080;
const ROLL_TICK_MS = 86;
const CELEBRATION_MS = 1800;
const FEVER_CELEBRATION_MS = 2200;

type SlotGameState = {
  credits: number;
  freeSpins: number;
  totalWins: number;
  grid: SlotSymbolId[][];
  outcome: SlotRoundOutcome | null;
  spinning: boolean;
  showCelebration: boolean;
  spinsPlayed: number;
};

const initialState: SlotGameState = {
  credits: 120,
  freeSpins: 0,
  totalWins: 0,
  grid: createPreviewGrid(),
  outcome: null,
  spinning: false,
  showCelebration: false,
  spinsPlayed: 0,
};

const formatOutcomeForText = (state: SlotGameState) => ({
  coordinateSystem: 'slot grid uses row 0..2 from top to bottom, column 0..4 from left to right',
  credits: state.credits,
  freeSpins: state.freeSpins,
  totalWins: state.totalWins,
  spinning: state.spinning,
  showCelebration: state.showCelebration,
  spinsPlayed: state.spinsPlayed,
  grid: state.grid,
  outcome: state.outcome
    ? {
        message: state.outcome.message,
        coins: state.outcome.coins,
        spinEnergy: state.outcome.spinEnergy,
        freeSpinsAwarded: state.outcome.freeSpinsAwarded,
        celebration: state.outcome.celebration,
        wins: state.outcome.wins,
      }
    : null,
});

export function SlotGame({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<SlotGameState>(initialState);
  const spinTimerRef = useRef<number | null>(null);
  const rollingTimerRef = useRef<number | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const canSpin = !state.spinning && (state.credits >= SPIN_COST || state.freeSpins > 0);

  const stopRollingPreview = () => {
    if (rollingTimerRef.current === null) return;
    window.clearInterval(rollingTimerRef.current);
    rollingTimerRef.current = null;
  };

  const dismissCelebration = () => {
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }

    setState((current) => ({
      ...current,
      showCelebration: false,
    }));
  };

  const startRollingPreview = () => {
    stopRollingPreview();
    rollingTimerRef.current = window.setInterval(() => {
      setState((current) => {
        if (!current.spinning) return current;

        return {
          ...current,
          grid: createPreviewGrid(),
        };
      });
    }, ROLL_TICK_MS);
  };

  const finishSpin = () => {
    if (spinTimerRef.current !== null) {
      window.clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    stopRollingPreview();

    setState((current) => {
      if (!current.spinning) return current;

      const result = controller.spin();
      const outcome = roundResolver.resolve(result);
      return {
        ...current,
        credits: current.credits + outcome.coins,
        freeSpins: current.freeSpins + outcome.freeSpinsAwarded,
        totalWins: current.totalWins + outcome.coins,
        grid: outcome.grid,
        outcome,
        spinning: false,
        showCelebration: outcome.celebration !== 'none',
        spinsPlayed: current.spinsPlayed + 1,
      };
    });
  };

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify(formatOutcomeForText(state));
    window.advanceTime = () => {
      window.dispatchEvent(new CustomEvent('slot:advance-time'));
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [state]);

  useEffect(() => {
    const handleAdvanceTime = () => finishSpin();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      }
    };

    window.addEventListener('slot:advance-time', handleAdvanceTime);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('slot:advance-time', handleAdvanceTime);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  useEffect(() => {
    if (!state.showCelebration || !state.outcome) return undefined;

    if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = window.setTimeout(
      dismissCelebration,
      state.outcome.celebration === 'fever' ? FEVER_CELEBRATION_MS : CELEBRATION_MS,
    );

    return () => {
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = null;
      }
    };
  }, [state.showCelebration, state.outcome]);

  useEffect(() => () => {
    if (spinTimerRef.current !== null) window.clearTimeout(spinTimerRef.current);
    stopRollingPreview();
    if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
  }, []);

  const spin = () => {
    if (!canSpin) return;

    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }

    const usedFreeSpin = state.freeSpins > 0;
    setState((current) => ({
      ...current,
      credits: usedFreeSpin ? current.credits : current.credits - SPIN_COST,
      freeSpins: usedFreeSpin ? current.freeSpins - 1 : current.freeSpins,
      grid: createPreviewGrid(),
      outcome: null,
      spinning: true,
      showCelebration: false,
    }));

    startRollingPreview();
    spinTimerRef.current = window.setTimeout(finishSpin, SPIN_ANIMATION_MS);
  };

  const refillCredits = () => {
    setState((current) => ({
      ...current,
      credits: current.credits + 60,
    }));
  };

  const activePositions = new Set(
    state.outcome?.wins.flatMap((win) => win.positions.map(([row, column]) => `${row}-${column}`)) ?? [],
  );

  return (
    <main className={`slot-game-shell${state.outcome ? ` celebration-${state.outcome.celebration}` : ''}`}>
      <button className="back-button slot-back" type="button" onClick={onBack}>返回</button>
      <section className="slot-stage" aria-label="霓虹老虎机">
        <div className="slot-marquee">
          <span>NEON SLOT</span>
          <strong>全屏彩金剧场</strong>
          <small>5 轴 3 行 · Wild · Scatter · Free Spins</small>
        </div>

        <div className={`slot-cabinet${state.spinning ? ' spinning' : ''}`}>
          <div className="slot-lightbar" />
          <div className="slot-reel-window">
            {state.grid.map((row, rowIndex) =>
              row.map((symbol, columnIndex) => (
                <div
                  className={`slot-cell${activePositions.has(`${rowIndex}-${columnIndex}`) ? ' win' : ''}`}
                  key={`${rowIndex}-${columnIndex}`}
                >
                  <SlotSymbol symbol={symbol} active={activePositions.has(`${rowIndex}-${columnIndex}`)} />
                </div>
              )),
            )}
          </div>
          <div className="slot-payline-glow" />
        </div>

        <aside className="slot-dashboard">
          <div>
            <span>余额</span>
            <strong>{state.credits}</strong>
          </div>
          <div>
            <span>免费旋转</span>
            <strong>{state.freeSpins}</strong>
          </div>
          <div>
            <span>累计赢取</span>
            <strong>{state.totalWins}</strong>
          </div>
        </aside>

        <div className="slot-actions">
          <button className="slot-spin-button" type="button" disabled={!canSpin} onClick={spin}>
            <span>{state.freeSpins > 0 ? 'FREE SPIN' : 'SPIN'}</span>
            <small>{state.freeSpins > 0 ? '本次免费' : `${SPIN_COST} 金币 / 次`}</small>
          </button>
          <button className="slot-refill-button" type="button" onClick={refillCredits}>
            补充金币
          </button>
        </div>

        <p className="slot-hint">按 F 可进入浏览器全屏；摇中 Scatter 会赠送免费旋转。</p>
      </section>

      <section
        className={`slot-win-overlay${state.showCelebration ? ' visible' : ''}${state.outcome?.celebration === 'fever' ? ' fever-notice' : ''}`}
        aria-live="polite"
        onClick={dismissCelebration}
      >
        <div className="slot-burst-ring" />
        <div className="slot-confetti" />
        <div className="slot-win-card" onClick={(event) => event.stopPropagation()}>
          <button className="slot-win-close" type="button" onClick={dismissCelebration} aria-label="关闭中奖提示">
            ×
          </button>
          <span>{state.outcome?.celebration.toUpperCase() ?? 'READY'}</span>
          <strong>{state.outcome?.message ?? '准备开转'}</strong>
          <small>{state.outcome?.wins.map((win) => win.label).join(' / ') ?? '等待下一次旋转'}</small>
        </div>
      </section>
    </main>
  );
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await document.documentElement.requestFullscreen();
}
