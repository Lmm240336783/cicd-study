export const GAME_CONFIG = {
  coins: {
    initialPlatformCount: 42,
    hardLimit: 80,
    radius: 0.18,
    halfHeight: 0.045,
  },
  platform: {
    width: 5.2,
    depth: 7,
    frontEdge: 3.45,
  },
  plate: {
    backZ: -2.85,
    travel: 1.25,
    normalCycle: 1.2,
    feverCycle: 0.8,
  },
  fever: {
    duration: 20,
    autoDropInterval: 0.48,
  },
  special: {
    bombRadius: 1.55,
    bombImpulse: 10,
    magnetRadius: 2,
    magnetDuration: 1.8,
    multiplierDuration: 10,
  },
} as const;

export const DROP_LANE_X = [-2, -1, 0, 1, 2] as const;
