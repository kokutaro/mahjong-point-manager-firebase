import { describe, expect, it } from 'vitest';
import type { Player, RoomState } from '../types';
import { applyAdjustment } from './adjustment';

const createPlayers = (): Player[] => [
  { id: 'p1', name: 'Alice', score: 25000, isRiichi: false, wind: 'East', chip: 0 },
  { id: 'p2', name: 'Bob', score: 25000, isRiichi: false, wind: 'South', chip: 0 },
  { id: 'p3', name: 'Carol', score: 25000, isRiichi: false, wind: 'West', chip: 0 },
  { id: 'p4', name: 'Dave', score: 25000, isRiichi: false, wind: 'North', chip: 0 },
];

const round: RoomState['round'] = {
  wind: 'East',
  number: 2,
  honba: 1,
  riichiSticks: 0,
};

describe('applyAdjustment', () => {
  it('deducts amount * receiverCount from payer and gives amount to each receiver', () => {
    const players = createPlayers();
    const result = applyAdjustment(players, round, {
      payerId: 'p1',
      receiverIds: ['p2', 'p3', 'p4'],
      amount: 4000,
      description: 'チョンボ',
    });

    expect(result.newPlayers.find((p) => p.id === 'p1')!.score).toBe(25000 - 12000);
    expect(result.newPlayers.find((p) => p.id === 'p2')!.score).toBe(25000 + 4000);
    expect(result.newPlayers.find((p) => p.id === 'p3')!.score).toBe(25000 + 4000);
    expect(result.newPlayers.find((p) => p.id === 'p4')!.score).toBe(25000 + 4000);
  });

  it('handles single receiver correctly', () => {
    const players = createPlayers();
    const result = applyAdjustment(players, round, {
      payerId: 'p2',
      receiverIds: ['p3'],
      amount: 1000,
    });

    expect(result.newPlayers.find((p) => p.id === 'p2')!.score).toBe(24000);
    expect(result.newPlayers.find((p) => p.id === 'p3')!.score).toBe(26000);
    expect(result.newPlayers.find((p) => p.id === 'p1')!.score).toBe(25000);
    expect(result.newPlayers.find((p) => p.id === 'p4')!.score).toBe(25000);
  });

  it('allows a 100-point transfer', () => {
    const result = applyAdjustment(createPlayers(), round, {
      payerId: 'p1',
      receiverIds: ['p2'],
      amount: 100,
    });

    expect(result.scoreDeltas).toMatchObject({ p1: -100, p2: 100 });
  });

  it.each([
    { label: 'zero', amount: 0 },
    { label: 'negative', amount: -100 },
    { label: 'less than 100 points', amount: 50 },
    { label: 'not a 100-point increment', amount: 150 },
    { label: 'fractional', amount: 100.5 },
    { label: 'not finite', amount: Number.POSITIVE_INFINITY },
  ])('rejects an amount that is $label', ({ amount }) => {
    expect(() =>
      applyAdjustment(createPlayers(), round, {
        payerId: 'p1',
        receiverIds: ['p2'],
        amount,
      }),
    ).toThrow('点数は100点単位の正の整数で指定してください');
  });

  it.each([
    {
      label: 'the payer is unknown',
      params: { payerId: 'unknown', receiverIds: ['p2'], amount: 100 },
    },
    {
      label: 'a receiver is unknown',
      params: { payerId: 'p1', receiverIds: ['unknown'], amount: 100 },
    },
    {
      label: 'there is no receiver',
      params: { payerId: 'p1', receiverIds: [], amount: 100 },
    },
    {
      label: 'the payer is also a receiver',
      params: { payerId: 'p1', receiverIds: ['p1'], amount: 100 },
    },
    {
      label: 'a receiver is duplicated',
      params: { payerId: 'p1', receiverIds: ['p2', 'p2'], amount: 100 },
    },
  ])('rejects invalid participants when $label', ({ params }) => {
    expect(() => applyAdjustment(createPlayers(), round, params)).toThrow();
  });

  it('rejects a transfer whose total cannot be represented safely', () => {
    const largestSafe100PointAmount = Math.floor(Number.MAX_SAFE_INTEGER / 100) * 100;

    expect(() =>
      applyAdjustment(createPlayers(), round, {
        payerId: 'p1',
        receiverIds: ['p2', 'p3'],
        amount: largestSafe100PointAmount,
      }),
    ).toThrow('合計点数が大きすぎます');
  });

  it('creates a HandLog with type Adjustment and description', () => {
    const players = createPlayers();
    const result = applyAdjustment(players, round, {
      payerId: 'p1',
      receiverIds: ['p2'],
      amount: 3000,
      description: '罰符',
    });

    expect(result.handLog.result.type).toBe('Adjustment');
    expect(result.handLog.result.description).toBe('罰符');
    expect(result.handLog.round).toEqual(round);
  });

  it('scoreDeltas sum to zero', () => {
    const players = createPlayers();
    const result = applyAdjustment(players, round, {
      payerId: 'p1',
      receiverIds: ['p2', 'p3', 'p4'],
      amount: 4000,
    });

    const sum = Object.values(result.scoreDeltas).reduce((acc, v) => acc + v, 0);
    expect(sum).toBe(0);
  });

  it('does not mutate original players array', () => {
    const players = createPlayers();
    const originalScores = players.map((p) => p.score);
    applyAdjustment(players, round, {
      payerId: 'p1',
      receiverIds: ['p2'],
      amount: 5000,
    });

    players.forEach((p, i) => {
      expect(p.score).toBe(originalScores[i]);
    });
  });

  it('preserves round info without mutation', () => {
    const players = createPlayers();
    const result = applyAdjustment(players, round, {
      payerId: 'p1',
      receiverIds: ['p2'],
      amount: 1000,
    });

    expect(result.handLog.round).toEqual(round);
    expect(result.handLog.round).not.toBe(round);
  });
});
