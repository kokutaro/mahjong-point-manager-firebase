import type {
  CompetitionParticipant,
  CompetitionSettings,
  GameSettings,
  Player,
  SeatAssignment,
} from '../types';
import {
  cloneNoFuFixedPoints,
  normalizeNoFuFixedPoints,
  normalizeYakitoriEnabled,
  normalizeYakitoriPoint,
} from './gameSettings';
import { WIND_ORDER } from './wind';

export const DEFAULT_COMPETITION_SETTINGS: CompetitionSettings = {
  length: 'Hanchan',
  startPoint4ma: 25000,
  startPoint3ma: 35000,
  returnPoint4ma: 30000,
  returnPoint3ma: 40000,
  uma: [10, 30],
  hasHonba: true,
  honbaPoints: 300,
  tenpaiRenchan: true,
  useTobi: true,
  useChip: false,
  chipRate: 0,
  useOka: true,
  useFuCalculation: true,
  noFuFixedPoints: cloneNoFuFixedPoints(),
  yakitoriEnabled: false,
  yakitoriPoint: 10,
  westExtension: false,
  rate: 0,
};

export const normalizeCompetitionSettings = (
  settings?: Partial<CompetitionSettings>,
): CompetitionSettings => {
  const nextSettings = settings ?? {};

  return {
    ...DEFAULT_COMPETITION_SETTINGS,
    ...nextSettings,
    noFuFixedPoints: normalizeNoFuFixedPoints(nextSettings.noFuFixedPoints),
    yakitoriEnabled: normalizeYakitoriEnabled(nextSettings.yakitoriEnabled),
    yakitoriPoint: normalizeYakitoriPoint(nextSettings.yakitoriPoint),
  };
};

export const buildGameSettingsFromCompetition = (
  settings: CompetitionSettings,
  mode: '3ma' | '4ma',
): GameSettings => {
  const { startPoint4ma, startPoint3ma, returnPoint4ma, returnPoint3ma, ...rest } = settings;
  return {
    ...rest,
    mode,
    isSingleMode: false,
    startPoint: mode === '4ma' ? startPoint4ma : startPoint3ma,
    returnPoint: mode === '4ma' ? returnPoint4ma : returnPoint3ma,
  };
};

export const orderPlayersBySeatAssignment = (
  players: Player[],
  participants: CompetitionParticipant[],
  seatAssignment: SeatAssignment,
): Player[] => {
  const participantByPlayerId = new Map(
    participants.map((participant) => [participant.userId ?? participant.id, participant]),
  );

  return [...players].sort((a, b) => {
    const participantA = participantByPlayerId.get(a.id);
    const participantB = participantByPlayerId.get(b.id);
    const windA = participantA ? seatAssignment[participantA.id] : undefined;
    const windB = participantB ? seatAssignment[participantB.id] : undefined;
    const indexA = windA ? WIND_ORDER.indexOf(windA) : WIND_ORDER.length;
    const indexB = windB ? WIND_ORDER.indexOf(windB) : WIND_ORDER.length;
    return indexA - indexB;
  });
};

export const restorePlayerWindsFromSeatAssignment = (
  players: Player[],
  participants: CompetitionParticipant[],
  seatAssignment: SeatAssignment,
  roundNumber: number,
): Player[] => {
  const activeWinds = WIND_ORDER.slice(0, players.length);
  if (activeWinds.length === 0) return players;

  const participantByPlayerId = new Map(
    participants.map((participant) => [participant.userId ?? participant.id, participant]),
  );
  const dealerRotations = Math.max(0, Math.trunc(roundNumber) - 1) % activeWinds.length;

  return players.map((player) => {
    const participant = participantByPlayerId.get(player.id);
    const initialWind = participant ? seatAssignment[participant.id] : undefined;
    const initialWindIndex = initialWind ? activeWinds.indexOf(initialWind) : -1;
    if (initialWindIndex === -1) return player;

    const currentWindIndex =
      (initialWindIndex - dealerRotations + activeWinds.length) % activeWinds.length;
    const wind = activeWinds[currentWindIndex];
    return player.wind === wind ? player : { ...player, wind };
  });
};

export const buildPlayersFromParticipants = (
  participants: CompetitionParticipant[],
  seatAssignment: SeatAssignment,
  startPoint: number,
): Player[] => {
  const players = participants.map((p) => ({
    id: p.userId ?? p.id,
    name: p.name,
    score: startPoint,
    isRiichi: false,
    wind: seatAssignment[p.id] ?? 'East',
    chip: 0,
  }));

  return orderPlayersBySeatAssignment(players, participants, seatAssignment);
};
