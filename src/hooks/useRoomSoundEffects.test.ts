// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LastEvent } from '../types';
import { useRoomSoundEffects } from './useRoomSoundEffects';

const playMock = vi.fn<() => Promise<void>>();
const createdAudioSources: string[] = [];
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

class AudioMock {
  public preload = '';
  public readonly src: string;

  constructor(src: string) {
    this.src = src;
    createdAudioSources.push(src);
  }

  play() {
    return playMock();
  }
}

const createLastEvent = (id: string, soundEffectCue?: LastEvent['soundEffectCue']): LastEvent => ({
  id,
  type: 'score_change',
  soundEffectCue,
  deltas: {
    player1: {
      hand: 1000,
      sticks: 0,
    },
  },
});

describe('useRoomSoundEffects', () => {
  beforeEach(() => {
    playMock.mockResolvedValue(undefined);
    createdAudioSources.length = 0;
    vi.stubGlobal('Audio', AudioMock);
  });

  afterEach(() => {
    playMock.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    consoleWarnSpy.mockClear();
  });

  it('plays the configured sound when enabled and a new cue event arrives', async () => {
    const { result, rerender } = renderHook(({ lastEvent }) => useRoomSoundEffects(lastEvent), {
      initialProps: {
        lastEvent: undefined as LastEvent | undefined,
      },
    });

    act(() => {
      result.current.setIsSoundEnabled(true);
    });

    rerender({ lastEvent: createLastEvent('event-1', 'riichi') });

    await waitFor(() => {
      expect(playMock).toHaveBeenCalledTimes(1);
    });

    expect(createdAudioSources).toEqual(['/sounds/reach.mp3']);
  });

  it('does not replay the same event on rerender', async () => {
    const event = createLastEvent('event-1', 'ron');
    const { result, rerender } = renderHook(({ lastEvent }) => useRoomSoundEffects(lastEvent), {
      initialProps: { lastEvent: undefined as LastEvent | undefined },
    });

    act(() => {
      result.current.setIsSoundEnabled(true);
    });

    rerender({ lastEvent: event });

    await waitFor(() => {
      expect(playMock).toHaveBeenCalledTimes(1);
    });

    rerender({ lastEvent: event });
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('only plays future events after the toggle is enabled', async () => {
    const { result, rerender } = renderHook(({ lastEvent }) => useRoomSoundEffects(lastEvent), {
      initialProps: { lastEvent: undefined as LastEvent | undefined },
    });

    rerender({ lastEvent: createLastEvent('event-1', 'ron') });
    expect(playMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setIsSoundEnabled(true);
    });

    rerender({ lastEvent: createLastEvent('event-2', 'tsumo') });

    await waitFor(() => {
      expect(playMock).toHaveBeenCalledTimes(1);
    });

    expect(createdAudioSources).toEqual(['/sounds/tsumo.mp3']);

    act(() => {
      result.current.setIsSoundEnabled(false);
    });

    rerender({ lastEvent: createLastEvent('event-3', 'riichi') });
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('swallows playback failures', async () => {
    playMock.mockRejectedValueOnce(new Error('blocked'));

    const { result, rerender } = renderHook(({ lastEvent }) => useRoomSoundEffects(lastEvent), {
      initialProps: { lastEvent: undefined as LastEvent | undefined },
    });

    act(() => {
      result.current.setIsSoundEnabled(true);
    });

    rerender({ lastEvent: createLastEvent('event-1', 'tsumo') });

    await waitFor(() => {
      expect(playMock).toHaveBeenCalledTimes(1);
    });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });
});
