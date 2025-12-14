import { describe, expect, it } from 'vitest';
import { calculateBasePoints, calculateScore } from './scoreCalculator';
import { calculateTransaction } from './scoreDiff';

describe('Score Calculator (4ma)', () => {
  it('calculates Mangan (30fu 4han)', () => {
    const res = calculateBasePoints(4, 30);
    expect(res.name).toBe('Mangan');
    expect(res.points).toBe(2000);
  });

  it('calculates Pin-Tsumo-Dora1 (30fu 3han) -> 3900 equiv', () => {
    // 30fu 3han = 30 * 2^(2+3) = 30 * 32 = 960
    const res = calculateBasePoints(3, 30);
    expect(res.points).toBe(960);
  });

  it('calculates Child Ron 30fu 4han (Mangan)', () => {
    // Base 2000. Child Ron = 8000.
    const score = calculateScore(4, 30, false, false);
    expect(score.ron).toBe(8000);
  });

  it('calculates Dealer Tsumo 30fu 4han (4000 all)', () => {
    // Base 2000. Dealer Tsumo = 4000 all.
    const score = calculateScore(4, 30, true, true);
    expect(score.tsumoAll).toBe(4000);
  });

  it('calculates Child Tsumo 30fu 3han (1000/2000)', () => {
    // Base 960. 
    // Kid pays: ceil(960) = 1000.
    // Dealer pays: ceil(960*2) = 1920 -> 2000.
    const score = calculateScore(3, 30, false, true);
    expect(score.tsumoKo).toBe(1000);
    expect(score.tsumoOya).toBe(2000);
  });
});

describe('Score Transaction (Diff)', () => {
  const players = ['A', 'B', 'C', 'D']; // A=East

  it('handles Child Ron (2000) with 1 Honba', () => {
    // Winner B(Child), Loser C. Honba 1.
    // Score: 30fu 1han (1000 pts).
    // Ron = 1000 (Base 240 -> ceil(960) -> 1000).
    // Total = 1000 + 300 = 1300.
    const payment = calculateScore(1, 30, false, false); // 1000
    const res = calculateTransaction(
      payment,
      'B', 'C', players, 'A',
      1, 0, '4ma'
    );

    expect(res.deltas.find(d => d.playerId === 'B')?.total).toBe(1300);
    expect(res.deltas.find(d => d.playerId === 'C')?.total).toBe(-1300);
    expect(res.deltas.find(d => d.playerId === 'A')?.total).toBe(0);
  });

  it('handles Dealer Tsumo (4000all) with 1 Honba', () => {
    // Winner A(Dealer). Honba 1.
    // Score: Mangan 4000 all.
    // Payment: 4000 + 100 = 4100 per person.
    // Total Win: 4100 * 3 = 12300.
    const payment = calculateScore(4, 30, true, true); // 4000 all
    const res = calculateTransaction(
      payment,
      'A', null, players, 'A',
      1, 0, '4ma'
    );

    const winDelta = res.deltas.find(d => d.playerId === 'A')?.total;
    const loseDelta = res.deltas.find(d => d.playerId === 'B')?.total;

    expect(loseDelta).toBe(-4100);
    expect(winDelta).toBe(12300);
  });

  it('handles Riichi Stick deposit', () => {
    // Winner A. 1 Riichi stick on table.
    // Win score: Dummy 1000.
    // A gets score + 1000.
    const payment = { ron: 1000, basePoints: 250, name: 'Test' };
    const res = calculateTransaction(
      payment,
      'A', 'B', players, 'A',
      0, 1, '4ma'
    );

    expect(res.deltas.find(d => d.playerId === 'A')?.total).toBe(2000); // 1000 score + 1000 stick
    expect(res.deltas.find(d => d.playerId === 'B')?.total).toBe(-1000);
  });
});
