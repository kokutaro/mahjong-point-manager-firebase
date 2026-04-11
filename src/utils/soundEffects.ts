import type { LastEvent, ScorePointDetail, SoundEffectCue } from '../types';

const SOUND_EFFECT_PATHS: Record<SoundEffectCue, string> = {
  riichi: '/sounds/reach.mp3',
  ron: '/sounds/ron.mp3',
  tsumo: '/sounds/tsumo.mp3',
};

export const getSoundEffectPath = (cue: SoundEffectCue): string => SOUND_EFFECT_PATHS[cue];

export const getSoundEffectCueFromResults = (
  results: Array<{ loserId: string | null }>,
): SoundEffectCue | null => {
  if (results.length === 0) {
    return null;
  }

  return results[0].loserId ? 'ron' : 'tsumo';
};

export const createScoreChangeLastEvent = (
  id: string,
  deltas: Record<string, ScorePointDetail>,
  soundEffectCue?: SoundEffectCue,
): LastEvent => {
  if (!soundEffectCue) {
    return {
      id,
      type: 'score_change',
      deltas,
    };
  }

  return {
    id,
    type: 'score_change',
    soundEffectCue,
    deltas,
  };
};

export const createRiichiLastEvent = (id: string, playerId: string): LastEvent =>
  createScoreChangeLastEvent(
    id,
    {
      [playerId]: {
        hand: -1000,
        sticks: 0,
      },
    },
    'riichi',
  );
