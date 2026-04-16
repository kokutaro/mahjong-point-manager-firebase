export type GameEndReason = 'Bankruptcy' | 'ScoreReached' | 'MaxRoundReached' | 'Aborted';

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
  gameEndReason?: GameEndReason;
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
  soundEffectCue?: SoundEffectCue;
  deltas: {
    [playerId: string]: ScorePointDetail;
  };
}

export type SoundEffectCue = 'riichi' | 'ron' | 'tsumo';

export type NoFuFixedPointHan = 1 | 2 | 3;

export interface NoFuFixedPointValue {
  child: number;
  dealer: number;
}

export type NoFuFixedPoints = Record<NoFuFixedPointHan, NoFuFixedPointValue>;

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
  noFuFixedPoints?: NoFuFixedPoints;
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
  competitionId?: string; // Associated competition ID
  tableId?: string; // Associated table ID within a competition
}

// --- Competition Types ---

export type CompetitionStatus = 'recruiting' | 'in_progress' | 'closed' | 'archived';

export interface CompetitionSettings extends Omit<
  GameSettings,
  'mode' | 'isSingleMode' | 'startPoint' | 'returnPoint'
> {
  startPoint4ma: number;
  startPoint3ma: number;
  returnPoint4ma: number;
  returnPoint3ma: number;
}

export interface Competition {
  id: string;
  name: string;
  description?: string;
  organizerId: string;
  coOrganizerIds: string[];
  status: CompetitionStatus;
  hasPasscode: boolean;
  settings: CompetitionSettings;
  createdAt: number;
  startedAt?: number;
  closedAt?: number;
}

export type ParticipantStatus = 'idle' | 'assigned' | 'playing';

export type ParticipantRole = 'organizer' | 'co_organizer' | 'player';

export interface CompetitionParticipant {
  id: string;
  userId?: string;
  name: string;
  isGuest: boolean;
  status: ParticipantStatus;
  currentTableId?: string;
  role: ParticipantRole;
  joinedAt: number;
}

export type TableStatus = 'open' | 'ready' | 'playing' | 'finished';

export type SeatAssignment = Record<string, 'East' | 'South' | 'West' | 'North'>;

export interface CompetitionTable {
  id: string;
  name: string;
  mode: '3ma' | '4ma';
  status: TableStatus;
  playerIds: string[];
  seatAssignment?: SeatAssignment;
  currentRoomId?: string;
  gameCount: number;
  createdAt: number;
}

export interface CompetitionGameResult {
  id: string;
  tableId: string;
  tableName: string;
  gameIndex: number;
  result: GameResult;
  participantIds: string[];
  timestamp: number;
}

export type AvatarPresetId = 'tile-red' | 'tile-blue' | 'tile-green';

export interface UserSettings {
  displayName: string;
  avatarPresetId: AvatarPresetId;
  defaultRoomSettings: GameSettings;
  defaultCompetitionSettings: CompetitionSettings;
  createdAt?: number | object;
  updatedAt?: number | object;
}

export interface UserSettingsDocument {
  displayName?: string;
  avatarPresetId?: AvatarPresetId;
  defaultRoomSettings?: Partial<GameSettings>;
  defaultCompetitionSettings?: Partial<CompetitionSettings>;
  createdAt?: number | object;
  updatedAt?: number | object;
}
