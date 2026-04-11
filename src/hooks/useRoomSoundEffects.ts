import { useCallback, useEffect, useRef, useState } from 'react';
import type { LastEvent, SoundEffectCue } from '../types';
import { getSoundEffectPath } from '../utils/soundEffects';

interface UseRoomSoundEffectsReturn {
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
}

const playSoundEffect = async (cue: SoundEffectCue): Promise<void> => {
  if (typeof Audio === 'undefined') {
    return;
  }

  try {
    const audio = new Audio(getSoundEffectPath(cue));
    audio.preload = 'auto';
    await audio.play();
  } catch (error) {
    console.warn('Failed to play sound effect.', error);
  }
};

export const useRoomSoundEffects = (lastEvent?: LastEvent): UseRoomSoundEffectsReturn => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const isInitializedRef = useRef(false);
  const previousEventIdRef = useRef<string | undefined>(undefined);

  const handleSoundEffect = useCallback(
    async (cue?: SoundEffectCue) => {
      if (!isSoundEnabled || !cue) {
        return;
      }

      await playSoundEffect(cue);
    },
    [isSoundEnabled],
  );

  useEffect(() => {
    if (!isInitializedRef.current) {
      previousEventIdRef.current = lastEvent?.id;
      isInitializedRef.current = true;
      return;
    }

    if (!lastEvent || lastEvent.id === previousEventIdRef.current) {
      return;
    }

    previousEventIdRef.current = lastEvent.id;
    void handleSoundEffect(lastEvent.soundEffectCue);
  }, [lastEvent, handleSoundEffect]);

  return {
    isSoundEnabled,
    setIsSoundEnabled,
  };
};
