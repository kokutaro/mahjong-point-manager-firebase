export interface Player {
  id: string;
  name: string;
  score: number;
  isRiichi: boolean;
  wind: 'East' | 'South' | 'West' | 'North';
  chip: number; // Chip count (positive/negative)
}

export interface PlayerGameResult {
  playerId: string;
  name: string;
  rank: number;
  rawScore: number;
  point: number;
  chipDiff: number;
}

export interface GameResult {
  id: string;
  timestamp: number;
  ruleSnapshot: GameSettings;
  scores: PlayerGameResult[];
  logs?: HandLog[]; // Detailed hand logs for this game
}

export interface ScorePointDetail {
  hand: number; // Yaku/Fu points
  sticks: number; // Riichi/Honba sticks
  chips?: number; // Chip count change
}

export interface ScorePayment {
  ron?: number; // Payment from target in Ron
  tsumoAll?: number; // Payment from everyone (if same)
  tsumoOya?: number; // Payment from Dealer (in Tsumo)
  tsumoKo?: number; // Payment from Non-Dealer (in Tsumo)
  basePoints: number; // Calculated base points (before rounding/multiplying)
  name: string; // e.g. "Mangan", "30fu 4han"
}

export interface HandLog {
  id: string;
  timestamp: number;
  round: {
    wind: 'East' | 'South' | 'West' | 'North';
    number: number;
    honba: number;
    riichiSticks: number;
  };

  result: {
    type: 'Win' | 'Draw';
    winners?: {
      id: string;
      payment: ScorePayment;
    }[];
    loserId?: string | null;
    riichiPlayerIds?: string[]; // IDs of players who had declared Riichi
    tenpaiPlayerIds?: string[];
    scoreDeltas: { [playerId: string]: number }; // Net score change for this hand
  };
}

export interface LastEvent {
  id: string; // Unique ID (timestamp or uuid)
  type: 'score_change';
  deltas: {
    [playerId: string]: ScorePointDetail;
  };
}

export interface GameSettings {
  mode: '4ma' | '3ma';
  length: 'Hanchan' | 'Tonpu'; // Default Hanchan
  startPoint: number;
  returnPoint: number;
  uma: [number, number]; // e.g. [10, 30] or [5, 10]
  hasHonba: boolean;
  honbaPoints: number; // 300 or 1500
  tenpaiRenchan: boolean;
  useTobi: boolean;
  useChip: boolean;
  chipRate?: number;
  useOka: boolean; // Toggle for Oka (ReturnPoint vs StartPoint logic)
  isSingleMode?: boolean; // Single Device Mode (Host controls all)
  useFuCalculation: boolean; // If false, use simplified scoring (fixed points for 1-3 han)
  westExtension: boolean; // West/North extension if score < returnPoint
  rate: number; // Settlement rate (e.g. 30, 50, 100)
}

export interface RoomState {
  id: string;
  hostId: string;
  roomName?: string;
  status: 'waiting' | 'playing' | 'finished' | 'ended';
  createdAt?: number | object;
  round: {
    wind: 'East' | 'South' | 'West' | 'North';
    number: number; // 1 = East 1, etc.
    honba: number;
    riichiSticks: number;
    count?: number; // 1=Initial, 2=Return, etc.
  };
  players: Player[];
  playerIds: string[]; // List of UIDs for security rules
  settings: GameSettings;
  history?: RoomState[];
  gameResults?: GameResult[];
  currentLogs?: HandLog[]; // Logs for the current active game (to be moved to gameResults on finish)
  lastEvent?: LastEvent;
}
