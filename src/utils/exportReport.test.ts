import { describe, expect, it } from 'vitest';
import { generateCsvBlob } from './exportReport';
import type { OverallStanding, MatchDetail } from './competitionReport';

const makeStanding = (overrides: Partial<OverallStanding> = {}): OverallStanding => ({
  rank: 1,
  participantId: 'p1',
  name: 'Player 1',
  gameCount: 3,
  totalPoint: 30,
  averageRank: 1.7,
  totalChip: 5,
  ...overrides,
});

const makeDetail = (overrides: Partial<MatchDetail> = {}): MatchDetail => ({
  tableName: 'A卓',
  gameIndex: 1,
  participantId: 'p1',
  name: 'Player 1',
  rank: 1,
  rawScore: 35000,
  point: 30,
  chipDiff: 2,
  timestamp: Date.now(),
  ...overrides,
});

describe('generateCsvBlob', () => {
  it('generates CSV with overall standings and match details', () => {
    const standings = [makeStanding()];
    const details = [makeDetail()];

    const blob = generateCsvBlob(standings, details, false);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv;charset=utf-8');
  });

  it('includes chip columns when useChip is true', async () => {
    const standings = [makeStanding({ totalChip: 5 })];
    const details = [makeDetail({ chipDiff: 2 })];

    const blob = generateCsvBlob(standings, details, true);
    const text = await blob.text();

    expect(text).toContain('チップ収支');
  });

  it('excludes chip columns when useChip is false', async () => {
    const standings = [makeStanding()];
    const details = [makeDetail()];

    const blob = generateCsvBlob(standings, details, false);
    const text = await blob.text();

    expect(text).not.toContain('チップ収支');
  });

  it('handles empty data', () => {
    const blob = generateCsvBlob([], [], false);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('escapes formula injection characters in names', async () => {
    const standings = [makeStanding({ name: '=HYPERLINK("http://evil.com","Click")' })];
    const details = [makeDetail({ name: '+cmd|calc' })];

    const blob = generateCsvBlob(standings, details, false);
    const text = await blob.text();

    // Formula-prefixed values should have single-quote prefix
    expect(text).toContain("'=HYPERLINK");
    expect(text).toContain("'+cmd|calc");
  });

  it('outputs sequential gameIndex in CSV', async () => {
    const standings = [makeStanding()];
    const details = [
      makeDetail({ gameIndex: 1, tableName: 'A卓', name: 'P1' }),
      makeDetail({ gameIndex: 2, tableName: 'A卓', name: 'P2' }),
    ];

    const blob = generateCsvBlob(standings, details, false);
    const text = await blob.text();

    const lines = text.split('\n');
    const detailLines = lines.filter((l) => l.startsWith('A卓'));
    expect(detailLines).toHaveLength(2);
    expect(detailLines[0]).toContain(',1,');
    expect(detailLines[1]).toContain(',2,');
  });

  it('formats average rank with one decimal place in CSV', async () => {
    const standings = [makeStanding({ averageRank: 2 })];
    const details = [makeDetail()];

    const blob = generateCsvBlob(standings, details, false);
    const text = await blob.text();

    expect(text).toContain(',2.0');
  });
});
