import { useId } from 'react';
import type { SlotSymbolId } from './SlotRound';

type SlotSymbolMeta = {
  label: string;
  shortLabel: string;
  palette: string;
  glow: string;
};

export const SLOT_SYMBOLS: Record<SlotSymbolId, SlotSymbolMeta> = {
  coin: {
    label: '金币',
    shortLabel: 'COIN',
    palette: 'from #fff3a6 to #f08b1b',
    glow: '#ffd35d',
  },
  gem: {
    label: '蓝宝石',
    shortLabel: 'GEM',
    palette: 'from #bcfbff to #1f9dff',
    glow: '#58d7ff',
  },
  energy: {
    label: '能量电池',
    shortLabel: 'ENERGY',
    palette: 'from #c5ff7d to #19d29a',
    glow: '#6fffbd',
  },
  wild: {
    label: '万能星',
    shortLabel: 'WILD',
    palette: 'from #fff4b8 to #ff4da8',
    glow: '#ff72bd',
  },
  scatter: {
    label: '免费旋转',
    shortLabel: 'SPIN',
    palette: 'from #d6c2ff to #7357ff',
    glow: '#a88cff',
  },
  bomb: {
    label: '炸弹币',
    shortLabel: 'BOMB',
    palette: 'from #ffd1d8 to #ff3158',
    glow: '#ff506d',
  },
  magnet: {
    label: '磁铁币',
    shortLabel: 'MAG',
    palette: 'from #f7d2ff to #9d4cff',
    glow: '#c980ff',
  },
  multiplier: {
    label: '倍率币',
    shortLabel: 'X2',
    palette: 'from #c8ffd8 to #2ced68',
    glow: '#71ff92',
  },
  giant: {
    label: '巨型币',
    shortLabel: 'GIANT',
    palette: 'from #fff9b8 to #ffba20',
    glow: '#ffd557',
  },
  jackpot: {
    label: '彩金冠冕',
    shortLabel: 'JACKPOT',
    palette: 'from #fff7c7 to #ff6336',
    glow: '#ffb84f',
  },
  fever: {
    label: '狂热火焰',
    shortLabel: 'FEVER',
    palette: 'from #fff0b0 to #ff1e78',
    glow: '#ff4f9a',
  },
};

export function SlotSymbol({ symbol, active = false }: { symbol: SlotSymbolId; active?: boolean }) {
  const meta = SLOT_SYMBOLS[symbol];

  return (
    <figure className={`slot-symbol slot-symbol-${symbol}${active ? ' active' : ''}`} title={meta.label}>
      <SymbolArt symbol={symbol} />
      <figcaption>{meta.shortLabel}</figcaption>
    </figure>
  );
}

function SymbolArt({ symbol }: { symbol: SlotSymbolId }) {
  if (symbol === 'coin') return <CoinIcon />;
  if (symbol === 'gem') return <GemIcon />;
  if (symbol === 'energy') return <EnergyIcon />;
  if (symbol === 'wild') return <WildIcon />;
  if (symbol === 'scatter') return <ScatterIcon />;
  if (symbol === 'bomb') return <BombIcon />;
  if (symbol === 'magnet') return <MagnetIcon />;
  if (symbol === 'multiplier') return <MultiplierIcon />;
  if (symbol === 'giant') return <GiantIcon />;
  if (symbol === 'jackpot') return <JackpotIcon />;
  return <FeverIcon />;
}

function CoinIcon() {
  const gradientId = `slot-coin-${useId().replaceAll(':', '')}`;

  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id={gradientId} cx="32%" cy="24%">
          <stop offset="0" stopColor="#fff8bc" />
          <stop offset="0.54" stopColor="#ffd04f" />
          <stop offset="1" stopColor="#d97813" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="42" fill={`url(#${gradientId})`} />
      <circle cx="60" cy="60" r="29" fill="none" stroke="#fff3a2" strokeWidth="7" />
      <path d="M60 33v54M43 47h24a12 12 0 0 1 0 24H43" fill="none" stroke="#8c4810" strokeLinecap="round" strokeWidth="9" />
    </svg>
  );
}

function GemIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M29 42 45 24h31l17 18-33 55Z" fill="#42d6ff" />
      <path d="m29 42 31 55 33-55H29Z" fill="#188dff" />
      <path d="M45 24 60 97 76 24" fill="none" stroke="#c6fbff" strokeWidth="5" />
      <path d="M31 42h58" stroke="#e4ffff" strokeLinecap="round" strokeWidth="6" />
    </svg>
  );
}

function EnergyIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <rect x="31" y="23" width="58" height="75" rx="18" fill="#102d30" stroke="#79ffce" strokeWidth="7" />
      <path d="M63 30 43 65h17l-8 30 27-42H61Z" fill="#8aff62" />
      <path d="M46 18h28" stroke="#d8ffe9" strokeLinecap="round" strokeWidth="8" />
    </svg>
  );
}

function WildIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="m60 18 12 27 29 3-22 20 6 29-25-15-25 15 6-29-22-20 29-3Z" fill="#ff4da8" />
      <path d="m60 31 8 19 20 2-15 14 4 20-17-10-17 10 4-20-15-14 20-2Z" fill="#fff4b8" />
      <path d="M43 61h34" stroke="#721743" strokeLinecap="round" strokeWidth="8" />
    </svg>
  );
}

function ScatterIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="40" fill="#7058ff" />
      <path d="M60 18v84M18 60h84M31 31l58 58M89 31 31 89" stroke="#d9c9ff" strokeLinecap="round" strokeWidth="7" />
      <circle cx="60" cy="60" r="16" fill="#fff3a5" />
    </svg>
  );
}

function BombIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="57" cy="69" r="32" fill="#ff365d" />
      <path d="M73 38c4-14 14-18 27-18" fill="none" stroke="#ffd371" strokeLinecap="round" strokeWidth="7" />
      <path d="m97 15 6 12 12 2-10 8 2 12-10-7-11 6 4-12-9-9 13-1Z" fill="#fff0a7" />
      <path d="M42 58c8-9 20-11 32-4" fill="none" stroke="#ffc2cc" strokeLinecap="round" strokeWidth="7" />
    </svg>
  );
}

function MagnetIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M34 31v35a26 26 0 0 0 52 0V31H70v34a10 10 0 0 1-20 0V31Z" fill="#ac57ff" />
      <path d="M34 31h17v20H34Zm35 0h17v20H69Z" fill="#ffd1f6" />
      <path d="M29 84c19 19 43 19 62 0" fill="none" stroke="#f4d5ff" strokeLinecap="round" strokeWidth="7" />
    </svg>
  );
}

function MultiplierIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <rect x="25" y="25" width="70" height="70" rx="22" fill="#24e562" />
      <path d="M43 43 77 77M77 43 43 77" stroke="#082a14" strokeLinecap="round" strokeWidth="10" />
      <path d="M30 92h60" stroke="#c7ffd6" strokeLinecap="round" strokeWidth="7" />
    </svg>
  );
}

function GiantIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="47" fill="#ffbf2d" />
      <circle cx="60" cy="60" r="33" fill="#fff49a" />
      <circle cx="60" cy="60" r="19" fill="#c97510" />
      <path d="M60 17v21M60 82v21M17 60h21M82 60h21" stroke="#fff4b8" strokeLinecap="round" strokeWidth="7" />
    </svg>
  );
}

function JackpotIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="m25 88 8-50 18 23 10-34 13 34 18-23 5 50Z" fill="#ff7d2d" />
      <path d="m25 88 72 0 0 12H25Z" fill="#fff1a6" />
      <circle cx="33" cy="38" r="8" fill="#fff1a6" />
      <circle cx="61" cy="26" r="8" fill="#fff1a6" />
      <circle cx="92" cy="38" r="8" fill="#fff1a6" />
    </svg>
  );
}

function FeverIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M66 15c7 20-4 24 9 39 6 7 15 13 15 27 0 22-17 34-32 34-19 0-34-12-34-34 0-18 12-30 25-42 7-6 12-13 17-24Z" fill="#ff2678" />
      <path d="M61 55c6 12-7 16 0 28 3 5 9 8 9 16a13 13 0 0 1-26 0c0-10 7-17 13-23 4-4 5-10 4-21Z" fill="#fff0a8" />
    </svg>
  );
}
