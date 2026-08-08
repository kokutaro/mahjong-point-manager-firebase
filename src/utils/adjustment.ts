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

export const isValidAdjustmentAmount = (amount: number): boolean => {
  return Number.isSafeInteger(amount) && amount > 0 && amount % 100 === 0;
};

const validateAdjustment = (players: Player[], params: AdjustmentParams): void => {
  const playerIds = new Set(players.map((player) => player.id));

  if (!isValidAdjustmentAmount(params.amount)) {
    throw new Error('点数は100点単位の正の整数で指定してください');
  }
  if (!playerIds.has(params.payerId)) {
    throw new Error('支払い元が対局者に含まれていません');
  }
  if (params.receiverIds.length === 0) {
    throw new Error('受取先を1人以上指定してください');
  }

  const uniqueReceiverIds = new Set(params.receiverIds);
  if (uniqueReceiverIds.size !== params.receiverIds.length) {
    throw new Error('受取先を重複して指定できません');
  }
  if (uniqueReceiverIds.has(params.payerId)) {
    throw new Error('支払い元を受取先に指定できません');
  }
  if (params.receiverIds.some((receiverId) => !playerIds.has(receiverId))) {
    throw new Error('受取先が対局者に含まれていません');
  }
  if (!Number.isSafeInteger(params.amount * params.receiverIds.length)) {
    throw new Error('合計点数が大きすぎます');
  }
};

export const applyAdjustment = (
  players: Player[],
  round: RoomState['round'],
  params: AdjustmentParams,
): AdjustmentResult => {
  validateAdjustment(players, params);

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
