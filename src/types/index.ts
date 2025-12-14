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
}

export interface ScorePointDetail {
  hand: number;   // Yaku/Fu points
  sticks: number; // Riichi/Honba sticks
  chips?: number; // Chip count change
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
}

export interface RoomState {
  id: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished' | 'ended';
  round: {
    wind: 'East' | 'South' | 'West' | 'North';
    number: number; // 1 = East 1, etc.
    honba: number;
    riichiSticks: number;
  };
  players: Player[];
  playerIds: string[]; // List of UIDs for security rules
  settings: GameSettings;
  history?: RoomState[];
  gameResults?: GameResult[];
  lastEvent?: LastEvent;
}
