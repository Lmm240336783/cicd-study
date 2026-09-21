import type { SlotResult } from '../core/SlotResolver';

export type SlotSymbolId =
  | 'coin'
  | 'gem'
  | 'energy'
  | 'wild'
  | 'scatter'
  | 'bomb'
  | 'magnet'
  | 'multiplier'
  | 'giant'
  | 'jackpot'
  | 'fever';

export type SlotWin = {
  label: string;
  positions: Array<[row: number, column: number]>;
};

export type SlotRoundOutcome = {
  grid: SlotSymbolId[][];
  wins: SlotWin[];
  coins: number;
  spinEnergy: number;
  freeSpinsAwarded: number;
  specialCoin?: SlotResult['specialCoin'];
  triggerFever: boolean;
  celebration: 'none' | 'line' | 'big' | 'jackpot' | 'fever';
  message: string;
};

const BASE_SYMBOLS: SlotSymbolId[] = [
  'coin',
  'coin',
  'coin',
  'gem',
  'gem',
  'energy',
  'wild',
  'bomb',
  'magnet',
  'multiplier',
  'giant',
  'scatter',
];

const SPECIAL_TO_SYMBOL = {
  bomb: 'bomb',
  magnet: 'magnet',
  multiplier: 'multiplier',
  giant: 'giant',
} as const satisfies Record<NonNullable<SlotResult['specialCoin']>, SlotSymbolId>;

const RESULT_LABEL = {
  noWin: '未中奖',
  smallCoins: '金币小奖',
  mediumCoins: '宝石连线',
  specialCoin: '特殊金币',
  jackpot: '彩金爆发',
  fever: '狂热免费旋转',
} as const satisfies Record<SlotResult['type'], string>;

const randomInt = (random: () => number, min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

const pick = <T,>(items: T[], random: () => number) =>
  items[Math.floor(random() * items.length)] ?? items[0];

const createRandomGrid = (random: () => number): SlotSymbolId[][] =>
  Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => pick(BASE_SYMBOLS, random)),
  );

const setLine = (grid: SlotSymbolId[][], row: number, symbols: SlotSymbolId[]) => {
  symbols.forEach((symbol, column) => {
    grid[row]![column] = symbol;
  });
};

const createLineWin = (label: string, row: number, length = 5): SlotWin => ({
  label,
  positions: Array.from({ length }, (_, column) => [row, column] as [number, number]),
});

export class SlotRoundResolver {
  constructor(private readonly random = Math.random) {}

  resolve(result: SlotResult): SlotRoundOutcome {
    const grid = createRandomGrid(this.random);
    const wins: SlotWin[] = [];
    let freeSpinsAwarded = 0;

    if (result.type === 'smallCoins') {
      setLine(grid, 1, ['coin', 'coin', 'wild', 'coin', pick(BASE_SYMBOLS, this.random)]);
      wins.push(createLineWin('金币三连', 1, 4));
    }

    if (result.type === 'mediumCoins') {
      setLine(grid, 1, ['gem', 'wild', 'gem', 'gem', 'gem']);
      wins.push(createLineWin('宝石四连', 1));
    }

    if (result.type === 'specialCoin') {
      const symbol = result.specialCoin ? SPECIAL_TO_SYMBOL[result.specialCoin] : 'wild';
      setLine(grid, 1, [symbol, 'wild', symbol, symbol, pick(['coin', 'gem'], this.random)]);
      wins.push(createLineWin('特殊金币三连', 1, 4));
    }

    if (result.type === 'jackpot') {
      setLine(grid, 1, ['jackpot', 'wild', 'jackpot', 'jackpot', 'jackpot']);
      grid[0]![2] = 'scatter';
      grid[2]![2] = 'scatter';
      wins.push(createLineWin('彩金五连', 1));
      freeSpinsAwarded = randomInt(this.random, 1, 2);
    }

    if (result.type === 'fever') {
      setLine(grid, 1, ['fever', 'scatter', 'fever', 'wild', 'fever']);
      grid[0]![1] = 'scatter';
      grid[2]![3] = 'scatter';
      wins.push(createLineWin('狂热触发', 1));
      freeSpinsAwarded = 5;
    }

    return {
      grid,
      wins,
      coins: result.coins,
      spinEnergy: result.spinEnergy,
      freeSpinsAwarded,
      specialCoin: result.specialCoin,
      triggerFever: Boolean(result.triggerFever),
      celebration: this.celebrationFor(result.type),
      message: this.messageFor(result),
    };
  }

  randomGrid(): SlotSymbolId[][] {
    return createRandomGrid(this.random);
  }

  private celebrationFor(type: SlotResult['type']): SlotRoundOutcome['celebration'] {
    if (type === 'noWin') return 'none';
    if (type === 'fever') return 'fever';
    if (type === 'jackpot') return 'jackpot';
    if (type === 'mediumCoins' || type === 'specialCoin') return 'big';
    return 'line';
  }

  private messageFor(result: SlotResult) {
    if (result.type === 'noWin') return '未中奖，金币 -5';
    if (result.triggerFever) return `狂热启动，获得 ${result.coins} 金币`;
    if (result.specialCoin) return `${RESULT_LABEL[result.type]}，获得 ${result.coins} 金币`;
    if (result.spinEnergy > 0) return `${RESULT_LABEL[result.type]}，能量 +${result.spinEnergy}`;
    return `${RESULT_LABEL[result.type]}，金币 +${result.coins}`;
  }
}
