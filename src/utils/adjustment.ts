import type { HandLog, Player, RoomState } from '../types';
import { generateId } from './id';

export interface AdjustmentParams {
  payerId: string;
  receiverIds: string[];
  amount: number;
  description?: string;
}

export interface AdjustmentResult {
  newPlayers: Player[];
  handLog: HandLog;
  scoreDeltas: Record<string, number>;
}

export const applyAdjustment = (
  players: Player[],
  round: RoomState['round'],
  params: AdjustmentParams,
): AdjustmentResult => {
  const { payerId, receiverIds, amount, description } = params;
  const totalDeduction = amount * receiverIds.length;

  const scoreDeltas: Record<string, number> = {};
  players.forEach((p) => {
    scoreDeltas[p.id] = 0;
  });
  scoreDeltas[payerId] = -totalDeduction;
  receiverIds.forEach((id) => {
    scoreDeltas[id] = (scoreDeltas[id] ?? 0) + amount;
  });

  const newPlayers = players.map((p) => ({
    ...p,
    score: p.score + (scoreDeltas[p.id] ?? 0),
  }));

  const handLog: HandLog = {
    id: generateId(12),
    timestamp: Date.now(),
    round: { ...round },
    result: {
      type: 'Adjustment',
      description,
      scoreDeltas,
    },
  };

  return { newPlayers, handLog, scoreDeltas };
};
