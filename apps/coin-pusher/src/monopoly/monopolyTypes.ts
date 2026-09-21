export type RegionCode = 'A' | 'B' | 'C' | 'D';

export type TileKind =
  | 'start'
  | 'property'
  | 'chance'
  | 'tax'
  | 'shop'
  | 'reward'
  | 'jail'
  | 'bank'
  | 'maintenance'
  | 'teleport';

export type ItemKey = 'controlDice' | 'rentFree' | 'quickBuild';

export type MonopolyPhase = 'needStart' | 'ready' | 'awaitingDecision' | 'gameOver';

export interface PropertyConfig {
  id: string;
  name: string;
  region: RegionCode;
  landCost: number;
  registrationFee: number;
  buildCosts: [number, number, number, number];
  upgradeRegistrationFee: number;
  rents: [number, number, number, number, number];
}

export interface BoardTile {
  id: string;
  index: number;
  name: string;
  kind: TileKind;
  description: string;
  propertyId?: string;
}

export interface PropertyState {
  config: PropertyConfig;
  ownerId: string | null;
  level: number;
}

export interface PlayerItems {
  controlDice: number;
  rentFree: number;
  quickBuild: number;
}

export interface PlayerState {
  id: string;
  name: string;
  shortName: string;
  color: string;
  isHuman: boolean;
  position: number;
  cash: number;
  skipTurns: number;
  jailed: boolean;
  bankrupt: boolean;
  laps: number;
  turnsTaken: number;
  items: PlayerItems;
}

export interface GlobalEffects {
  extraStartBonusRounds: number;
  registrationDiscountRounds: number;
  rentDiscountRegion: RegionCode | null;
  rentDiscountRounds: number;
  constructionSurchargeRegion: RegionCode | null;
  constructionSurchargeRounds: number;
  closedTileId: string | null;
  closedTileRounds: number;
}

export interface ShopOffer {
  key: ItemKey;
  label: string;
  cost: number;
  description: string;
}

export type PendingAction =
  | { type: 'buy'; propertyId: string }
  | { type: 'upgrade'; propertyId: string }
  | { type: 'rent'; propertyId: string; ownerId: string; rent: number }
  | { type: 'shop'; tileId: string; offers: ShopOffer[] }
  | { type: 'jail'; cost: number };

export interface MonopolySession {
  board: BoardTile[];
  players: PlayerState[];
  properties: Record<string, PropertyState>;
  currentPlayerIndex: number;
  round: number;
  phase: MonopolyPhase;
  pendingAction: PendingAction | null;
  status: string;
  lastRoll: number | null;
  logs: string[];
  winnerIds: string[];
  gameStartedAt: number;
  nextTimedEventCheckAt: number;
  lastTimedEventAt: number | null;
  queuedTimedEvent: boolean;
  lastTimedEventLabel: string | null;
  effects: GlobalEffects;
}
