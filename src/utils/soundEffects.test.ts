import { describe, expect, it } from 'vitest';
import type { ScorePointDetail } from '../types';
import {
  createRiichiLastEvent,
  createScoreChangeLastEvent,
  getSoundEffectCueFromResults,
  getSoundEffectPath,
} from './soundEffects';

describe('soundEffects', () => {
  it('returns the configured path for each cue', () => {
    expect(getSoundEffectPath('riichi')).toBe('/sounds/reach.mp3');
    expect(getSoundEffectPath('ron')).toBe('/sounds/ron.mp3');
    expect(getSoundEffectPath('tsumo')).toBe('/sounds/tsumo.mp3');
  });

  it('resolves ron and tsumo cues from result payloads', () => {
    expect(getSoundEffectCueFromResults([{ loserId: 'loser-1' }])).toBe('ron');
    expect(getSoundEffectCueFromResults([{ loserId: null }])).toBe('tsumo');
    expect(getSoundEffectCueFromResults([])).toBeNull();
  });

  it('creates a score change event with an optional sound cue', () => {
    const deltas: Record<string, ScorePointDetail> = {
      winner: { hand: 7700, sticks: 1000 },
    };

    expect(createScoreChangeLastEvent('event-1', deltas, 'ron')).toEqual({
      id: 'event-1',
      type: 'score_change',
      soundEffectCue: 'ron',
      deltas,
    });

    expect(createScoreChangeLastEvent('event-2', deltas)).toEqual({
      id: 'event-2',
      type: 'score_change',
      deltas,
    });
  });

  it('creates a riichi event with the expected delta', () => {
    expect(createRiichiLastEvent('event-3', 'player-1')).toEqual({
      id: 'event-3',
      type: 'score_change',
      soundEffectCue: 'riichi',
      deltas: {
        'player-1': {
          hand: -1000,
          sticks: 0,
        },
      },
    });
  });
});
