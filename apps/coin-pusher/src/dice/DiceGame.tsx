import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AudioManager } from '../audio/AudioManager';
import { DiceRollerScene } from './DiceRollerScene';

type DiceGameProps = {
  onBack: () => void;
};

const MIN_DICE = 1;
const MAX_DICE = 8;
const COVER_DRAG_DISTANCE = 220;
const createEmptyFaces = (count: number) => Array.from({ length: count }, () => 1);

export function DiceGame({ onBack }: DiceGameProps) {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<DiceRollerScene | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const coverProgressRef = useRef(1);
  const dragStateRef = useRef<{ pointerId: number; startY: number; startProgress: number } | null>(null);
  const [diceCount, setDiceCount] = useState(5);
  const [faces, setFaces] = useState(() => createEmptyFaces(5));
  const [locked, setLocked] = useState<boolean[]>(() => Array.from({ length: 5 }, () => false));
  const [coverOpen, setCoverOpen] = useState(true);
  const visibleFaces = Array.from({ length: diceCount }, (_, index) => faces[index] ?? 1);
  const topFaceCounts = visibleFaces.reduce<Record<number, number>>((counts, face) => {
    counts[face] = (counts[face] ?? 0) + 1;
    return counts;
  }, {});
  const maxFaceCount = Math.max(...Object.values(topFaceCounts));
  const maxFaces = Object.entries(topFaceCounts)
    .filter(([, count]) => count === maxFaceCount)
    .map(([face]) => Number(face))
    .sort((left, right) => left - right);
  const maxFaceLabel = maxFaces.length === 1 ? `${maxFaces[0]}点` : `${maxFaces.join(' / ')}点并列`;

  useEffect(() => {
    if (!sceneHostRef.current) return undefined;
    const scene = new DiceRollerScene(sceneHostRef.current, {
      onFacesChange: setFaces,
      onImpact: () => audioRef.current?.play('diceImpact'),
      onRollingChange: () => undefined,
    });
    sceneRef.current = scene;
    void scene.init();

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current = new AudioManager();
  }, []);

  useEffect(() => {
    sceneRef.current?.setDiceCount(diceCount);
  }, [diceCount]);

  useEffect(() => {
    sceneRef.current?.setLocked(locked);
  }, [locked]);

  useEffect(() => {
    const nextProgress = coverOpen ? 1 : 0;
    coverProgressRef.current = nextProgress;
    sceneRef.current?.setCoverOpen(coverOpen);
  }, [coverOpen]);

  const updateDiceCount = (nextCount: number) => {
    const safeCount = Math.min(MAX_DICE, Math.max(MIN_DICE, nextCount));
    setDiceCount(safeCount);
    setFaces((current) => {
      if (safeCount > current.length) return [...current, ...createEmptyFaces(safeCount - current.length)];
      return current.slice(0, safeCount);
    });
    setLocked((current) => {
      if (safeCount > current.length) return [...current, ...Array.from({ length: safeCount - current.length }, () => false)];
      return current.slice(0, safeCount);
    });
  };

  const toggleLock = (index: number) => {
    setLocked((current) => current.map((value, currentIndex) => (currentIndex === index ? !value : value)));
  };

  const shakeDice = () => {
    audioRef.current?.play('diceShake');
    sceneRef.current?.roll();
  };

  const syncCoverProgress = (nextProgress: number) => {
    coverProgressRef.current = nextProgress;
    sceneRef.current?.setCoverProgress(nextProgress);
  };

  const handleCoverPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startProgress: coverProgressRef.current,
    };
  };

  const handleCoverPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const nextProgress = Math.min(
      1,
      Math.max(0, dragState.startProgress + (dragState.startY - event.clientY) / COVER_DRAG_DISTANCE),
    );
    syncCoverProgress(nextProgress);
  };

  const finishCoverDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    const nextOpen = coverProgressRef.current >= 0.5;
    syncCoverProgress(nextOpen ? 1 : 0);
    setCoverOpen(nextOpen);
  };

  return (
    <main className="dice-shell">
      <header className="dice-header">
        <button className="back-button" type="button" onClick={onBack}>返回</button>
        <div>
          <h1>摇骰子</h1>
        </div>
      </header>

      <section className="dice-controls" aria-label="骰子设置">
        <label className="dice-count-control">
          <span>骰子个数</span>
          <input
            type="range"
            min={MIN_DICE}
            max={MAX_DICE}
            value={diceCount}
            onChange={(event) => updateDiceCount(Number(event.target.value))}
          />
          <strong>{diceCount}</strong>
        </label>
        <button className="cover-toggle" type="button" onClick={() => setCoverOpen((value) => !value)}>
          {coverOpen ? '关闭罩子' : '打开罩子'}
        </button>
      </section>

      <section className="dice-stage" aria-label="骰子区域">
        <div className="dice-stage-layout">
          <div className="dice-viewport" ref={sceneHostRef}>
            <div
              className="dice-cover-touch"
              role="button"
              tabIndex={0}
              aria-label={coverOpen ? '罩子已打开' : '罩子已关闭'}
              onPointerDown={handleCoverPointerDown}
              onPointerMove={handleCoverPointerMove}
              onPointerUp={finishCoverDrag}
              onPointerCancel={finishCoverDrag}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setCoverOpen((value) => !value);
              }}
            >
              <span />
            </div>
          </div>

          <div className="dice-locks" aria-label="骰子锁定">
            {visibleFaces.map((face, index) => (
              <button
                className={`dice-lock ${locked[index] ? 'active' : ''}`}
                type="button"
                key={index}
                onClick={() => toggleLock(index)}
                aria-pressed={locked[index]}
                aria-label={`${index + 1}号骰子${face}点，${locked[index] ? '已锁定' : '未锁定'}`}
                title={`${index + 1}号骰子`}
              >
                {index + 1}号
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="top-face-summary" aria-label="朝上最多点数">
        <span>朝上最多</span>
        <strong>{maxFaceLabel}</strong>
        <small>{maxFaceCount} 颗</small>
      </section>

      <footer className="dice-actions">
        <button className="shake-button" type="button" onClick={shakeDice}>
          摇
        </button>
      </footer>
    </main>
  );
}
