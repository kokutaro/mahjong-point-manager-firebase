// Mahjong Rules and Types

export type GameMode = '4ma' | '3ma';

export type Wind = 'East' | 'South' | 'West' | 'North';

export interface GameRule {
  mode: GameMode;
  startScore: number;
  returnScore: number; // Kaeshi score (e.g. 25000 start, 30000 return)
  uma: number[]; // e.g. [20, 10, -10, -20]
  useChip: boolean;
  chipRate: number; // e.g. 10 points per chip (often mapped to currency, but here maybe score equivalent)
  // Usually chips are separate from score, but sometimes converted.
  // For this app, chips are count.
  useFuCalculation: boolean;
  westExtension: boolean;
}

export const WINDS: Wind[] = ['East', 'South', 'West', 'North'];

export const DEFAULT_RULES: Record<GameMode, GameRule> = {
  '4ma': {
    mode: '4ma',
    startScore: 25000,
    returnScore: 30000,
    uma: [20, 10, -10, -20], // 5-10-20 system or similar. Needs check. Usually +20/+10/-10/-20 or +30/+10/-10/-30.
    // Default to M-League rules: +50 / +10 / -10 / -30 (30000 base) ?
    // Let's use common Tenhou/NetMahjong defaults: 25000 start, 30000 return. Uma 10-20 or 20-30?
    // Let's set default generic 10-30 for now.
    useChip: false,
    chipRate: 0,
    useFuCalculation: true,
    westExtension: false,
  },
  '3ma': {
    mode: '3ma',
    startScore: 35000,
    returnScore: 40000,
    uma: [20, 0, -20], // Dummy defaults
    useChip: false,
    chipRate: 0,
    useFuCalculation: true,
    westExtension: false,
  },
};

export type WinType = 'Ron' | 'Tsumo';

export interface ScoreContext {
  han: number; // 飜
  fu: number; // 符
  isDealer: boolean; // 親かどうか
  honba: number; // 積み棒
}

// Basic Score Table Elements (example usage)
// Mangan, Haneman, Baiman, Sanbaiman, Yakuman
export const SCORE_LIMITS = {
  MANGAN: 2000, // Base points (East: 4000, Ron: 12000 etc logic to be handled in calculator)
  HANEMAN: 3000,
  BAIMAN: 4000,
  SANBAIMAN: 6000,
  YAKUMAN: 8000,
};
