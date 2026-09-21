import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { GameApp } from './GameApp';
import { DICE_ROUTE, HOME_ROUTE, IMAGE_GENERATOR_ROUTE, SLOT_ROUTE, VOICE_DEBUG_ROUTE } from './appRoutes';
import { DiceRoutePage } from './dice/DiceRoutePage';
import { ImageRoutePage } from './image/ImageRoutePage';
import { SlotRoutePage } from './slot/SlotRoutePage';
import { VoiceDebugRoutePage } from './voice/VoiceDebugRoutePage';

type AppMode = 'home' | 'pusher';

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

function HomeScreen({
  onOpenDice,
  onOpenImageGenerator,
  onOpenSlot,
  onOpenVoiceDebug,
}: {
  onOpenDice: () => void;
  onOpenImageGenerator: () => void;
  onOpenSlot: () => void;
  onOpenVoiceDebug: () => void;
}) {
  return (
    <main className="mode-shell">
      <section className="mode-hero">
        <span className="mode-kicker">当前优先级：摇骰子</span>
        <h1>选择玩法</h1>
        <p>摇骰子独立开发；老虎机负责后续赚金币，推币机负责后续搏奖励。</p>
      </section>

      <section className="mode-grid" aria-label="玩法入口">
        <button
          className="mode-card image-entry"
          type="button"
          onClick={onOpenImageGenerator}
          onPointerUp={onOpenImageGenerator}
        >
          <span className="mode-icon image">图</span>
          <strong>生成图片</strong>
          <small>输入提示词生成 base64 PNG，支持 1K、2K、4K 和下载</small>
        </button>
        <button className="mode-card primary" type="button" onClick={onOpenDice} onPointerUp={onOpenDice}>
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
        <button className="mode-card slot-entry" type="button" onClick={onOpenSlot} onPointerUp={onOpenSlot}>
          <span className="mode-icon">机</span>
          <strong>老虎机</strong>
          <small>霓虹全屏演出，Wild、Scatter、免费旋转和彩金爆发</small>
        </button>
      </section>
    </main>
  );
}

function HomeRoute() {
  const [mode, setMode] = useState<AppMode>('home');
  const navigate = useNavigate();

  if (mode === 'pusher') {
    return (
      <>
        <button className="back-button floating" type="button" onClick={() => setMode('home')}>返回</button>
        <PusherGame />
      </>
    );
  }
  return (
    <HomeScreen
      onOpenDice={() => navigate(DICE_ROUTE)}
      onOpenImageGenerator={() => navigate(IMAGE_GENERATOR_ROUTE)}
      onOpenSlot={() => navigate(SLOT_ROUTE)}
      onOpenVoiceDebug={() => navigate(VOICE_DEBUG_ROUTE)}
    />
  );
}

export function App() {
  return (
    <Routes>
      <Route path={HOME_ROUTE} element={<HomeRoute />} />
      <Route path={DICE_ROUTE} element={<DiceRoutePage />} />
      <Route path={IMAGE_GENERATOR_ROUTE} element={<ImageRoutePage />} />
      <Route path={SLOT_ROUTE} element={<SlotRoutePage />} />
      <Route path={VOICE_DEBUG_ROUTE} element={<VoiceDebugRoutePage />} />
      <Route path="*" element={<Navigate to={HOME_ROUTE} replace />} />
    </Routes>
  );
}
