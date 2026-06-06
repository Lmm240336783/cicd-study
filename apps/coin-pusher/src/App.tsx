import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { GameApp } from './GameApp';
import { DiceGame } from './dice/DiceGame';
import { HOME_ROUTE, VOICE_DEBUG_ROUTE } from './appRoutes';
import { VoiceDebugPage } from './voice/VoiceDebugPage';

type AppMode = 'home' | 'dice' | 'pusher' | 'slot';

function PusherGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const game = new GameApp(hostRef.current);
    void game.start();

    return () => {
      game.destroy();
    };
  }, []);

  return <div id="game-root" ref={hostRef} />;
}

function HomeScreen({ onSelect, onOpenVoiceDebug }: { onSelect: (mode: AppMode) => void; onOpenVoiceDebug: () => void }) {
  const openDice = () => onSelect('dice');

  return (
    <main className="mode-shell">
      <section className="mode-hero">
        <span className="mode-kicker">当前优先级：摇骰子</span>
        <h1>选择玩法</h1>
        <p>摇骰子独立开发；老虎机负责后续赚金币，推币机负责后续搏奖励。</p>
      </section>

      <section className="mode-grid" aria-label="玩法入口">
        <button className="mode-card primary" type="button" onClick={openDice} onPointerUp={openDice}>
          <span className="mode-icon">骰</span>
          <strong>摇骰子</strong>
          <small>设置骰子、锁定、盖罩、摇晃、统计点数</small>
        </button>
        <button className="mode-card accent" type="button" onClick={onOpenVoiceDebug}>
          <span className="mode-icon voice">音</span>
          <strong>音频调试</strong>
          <small>独立路由调试本地语音服务，上传参考音频并试听短句</small>
        </button>
        <button className="mode-card disabled" type="button" disabled>
          <span className="mode-icon">推</span>
          <strong>推币机</strong>
          <small>暂不改动，保留当前原型</small>
        </button>
        <button className="mode-card disabled" type="button" disabled>
          <span className="mode-icon">机</span>
          <strong>老虎机</strong>
          <small>暂缓处理，后续作为金币来源</small>
        </button>
      </section>
    </main>
  );
}

function SlotPlaceholder({ onBack }: { onBack: () => void }) {
  return (
    <main className="mode-shell">
      <button className="back-button" type="button" onClick={onBack}>返回</button>
      <section className="mode-hero">
        <span className="mode-kicker">暂缓处理</span>
        <h1>老虎机</h1>
        <p>当前先不调整老虎机逻辑，后续再做成赚金币的独立玩法。</p>
      </section>
    </main>
  );
}

function HomeRoute() {
  const [mode, setMode] = useState<AppMode>('home');
  const navigate = useNavigate();

  if (mode === 'dice') return <DiceGame onBack={() => setMode('home')} />;
  if (mode === 'pusher') {
    return (
      <>
        <button className="back-button floating" type="button" onClick={() => setMode('home')}>返回</button>
        <PusherGame />
      </>
    );
  }
  if (mode === 'slot') return <SlotPlaceholder onBack={() => setMode('home')} />;
  return <HomeScreen onSelect={setMode} onOpenVoiceDebug={() => navigate(VOICE_DEBUG_ROUTE)} />;
}

function VoiceDebugRoute() {
  const navigate = useNavigate();
  return <VoiceDebugPage onBack={() => navigate(HOME_ROUTE)} />;
}

export function App() {
  return (
    <Routes>
      <Route path={HOME_ROUTE} element={<HomeRoute />} />
      <Route path={VOICE_DEBUG_ROUTE} element={<VoiceDebugRoute />} />
      <Route path="*" element={<Navigate to={HOME_ROUTE} replace />} />
    </Routes>
  );
}
