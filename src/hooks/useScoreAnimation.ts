import { useEffect, useRef, useState } from 'react';
import type { LastEvent } from '../types';

const HAND_DURATION = 800;
const PAUSE = 400;
const STICK_DURATION = 800;
const FADE_OUT_DELAY = 1500;
const FALLBACK_DURATION = 1000;

export interface ScoreDelta {
  value: number;
  type: 'hand' | 'stick' | 'simple';
}

interface UseScoreAnimationOptions {
  playerId: string;
  score: number;
  lastEvent?: LastEvent;
}

interface UseScoreAnimationReturn {
  displayScore: number;
  delta: ScoreDelta | null;
  isAnimating: boolean;
}

export const useScoreAnimation = ({
  playerId,
  score,
  lastEvent,
}: UseScoreAnimationOptions): UseScoreAnimationReturn => {
  const [displayScore, setDisplayScore] = useState(score);
  const [delta, setDelta] = useState<ScoreDelta | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const prevEventIdRef = useRef<string | undefined>(lastEvent?.id);
  const prevScoreRef = useRef(score);

  useEffect(() => {
    if (lastEvent && lastEvent.id !== prevEventIdRef.current) {
      const myDelta = lastEvent.deltas[playerId];
      if (myDelta) {
        const totalDelta = myDelta.hand + myDelta.sticks;

        if (!Number.isFinite(totalDelta) || Math.abs(totalDelta) > 500000) {
          prevEventIdRef.current = lastEvent.id;
          prevScoreRef.current = score;
          requestAnimationFrame(() => {
            setDisplayScore(score);
          });
          return;
        }

        const startScore = score - totalDelta;

        prevEventIdRef.current = lastEvent.id;
        prevScoreRef.current = score;

        const frameIds: number[] = [];

        frameIds.push(
          requestAnimationFrame(() => {
            setIsAnimating(true);
            setDisplayScore(startScore);
            if (myDelta.hand !== 0) setDelta({ value: myDelta.hand, type: 'hand' });
            else if (myDelta.sticks !== 0) setDelta({ value: myDelta.sticks, type: 'stick' });

            const startTime = performance.now();

            const animate = (now: number) => {
              const elapsed = now - startTime;

              if (elapsed < HAND_DURATION) {
                const progress = elapsed / HAND_DURATION;
                const ease = 1 - Math.pow(1 - progress, 3);
                setDisplayScore(Math.floor(startScore + myDelta.hand * ease));
                frameIds.push(requestAnimationFrame(animate));
              } else if (elapsed < HAND_DURATION + PAUSE) {
                setDisplayScore(startScore + myDelta.hand);
                frameIds.push(requestAnimationFrame(animate));
              } else if (elapsed < HAND_DURATION + PAUSE + STICK_DURATION) {
                const stickElapsed = elapsed - (HAND_DURATION + PAUSE);
                const progress = stickElapsed / STICK_DURATION;
                const ease = 1 - Math.pow(1 - progress, 3);
                setDisplayScore(Math.floor(startScore + myDelta.hand + myDelta.sticks * ease));
                frameIds.push(requestAnimationFrame(animate));
              } else {
                setDisplayScore(score);
                setIsAnimating(false);
              }
            };

            frameIds.push(requestAnimationFrame(animate));
          }),
        );

        const timers: ReturnType<typeof setTimeout>[] = [];

        if (myDelta.sticks !== 0 && myDelta.hand !== 0) {
          const switchDelay = HAND_DURATION + PAUSE / 2;
          timers.push(
            setTimeout(() => {
              setDelta({ value: myDelta.sticks, type: 'stick' });
            }, switchDelay),
          );
        }

        const totalDuration = HAND_DURATION + PAUSE + STICK_DURATION + FADE_OUT_DELAY;
        timers.push(
          setTimeout(() => {
            setDelta(null);
          }, totalDuration),
        );

        return () => {
          timers.forEach(clearTimeout);
          frameIds.forEach((frameId) => cancelAnimationFrame(frameId));
        };
      } else {
        prevEventIdRef.current = lastEvent.id;
        prevScoreRef.current = score;
        requestAnimationFrame(() => {
          setDisplayScore(score);
        });
      }
    } else if (prevScoreRef.current !== score) {
      const diff = score - prevScoreRef.current;
      if (diff !== 0) {
        const start = prevScoreRef.current;
        const frameIds: number[] = [];

        frameIds.push(
          requestAnimationFrame(() => {
            setDelta({ value: diff, type: 'simple' });
            const startTime = performance.now();

            const animateSimple = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / FALLBACK_DURATION, 1);
              const ease = 1 - Math.pow(1 - progress, 3);
              setDisplayScore(Math.floor(start + diff * ease));
              if (progress < 1) {
                frameIds.push(requestAnimationFrame(animateSimple));
              } else {
                setDelta(null);
                setDisplayScore(score);
                prevScoreRef.current = score;
              }
            };

            frameIds.push(requestAnimationFrame(animateSimple));
          }),
        );

        return () => {
          frameIds.forEach((frameId) => cancelAnimationFrame(frameId));
        };
      }
    } else {
      if (!isAnimating) {
        requestAnimationFrame(() => {
          setDisplayScore(score);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, lastEvent?.id]);

  return { displayScore, delta, isAnimating };
};
