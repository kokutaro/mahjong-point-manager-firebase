import { useEffect, useRef } from 'react';
import { useScoreAnimation } from '../../hooks/useScoreAnimation';
import type { LastEvent } from '../../types';
import { ScoreDisplay } from './ScoreDisplay';
import styles from './AnimatedScore.module.css';

interface AnimatedScoreProps {
  playerId: string;
  score: number;
  lastEvent?: LastEvent;
  size?: 'small' | 'medium' | 'large' | 'jumbo';
  className?: string;
  onDisplayScoreChange?: (playerId: string, score: number) => void;
}

export const AnimatedScore = ({
  playerId,
  score,
  lastEvent,
  size = 'large',
  className,
  onDisplayScoreChange,
}: AnimatedScoreProps) => {
  const { displayScore, delta } = useScoreAnimation({ playerId, score, lastEvent });
  const onDisplayScoreChangeRef = useRef(onDisplayScoreChange);

  useEffect(() => {
    onDisplayScoreChangeRef.current = onDisplayScoreChange;
  }, [onDisplayScoreChange]);

  useEffect(() => {
    onDisplayScoreChangeRef.current?.(playerId, displayScore);
  }, [displayScore, playerId]);

  return (
    <>
      {delta !== null && (
        <span
          key={`${delta.type}-${delta.value}`}
          className={`${styles.delta} ${delta.value > 0 ? styles.deltaPositive : styles.deltaNegative}`}
        >
          {delta.value > 0 ? '+' : delta.value < 0 ? '-' : ''}
          {Math.abs(delta.value).toLocaleString()}
        </span>
      )}
      <ScoreDisplay score={displayScore} size={size} className={className} />
    </>
  );
};
