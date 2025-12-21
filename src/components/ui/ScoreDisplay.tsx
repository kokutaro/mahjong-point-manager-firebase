import styles from './ScoreDisplay.module.css';

interface ScoreDisplayProps {
  score: number;
  size?: 'small' | 'medium' | 'large' | 'jumbo';
  showDiff?: boolean; // if true, shows +/- prefix and color
  className?: string;
}

export const ScoreDisplay = ({
  score,
  size = 'medium',
  showDiff = false,
  className,
}: ScoreDisplayProps) => {
  const isPositive = score > 0;
  const isNegative = score < 0;

  const formattedScore = Math.abs(score).toLocaleString();
  const formatted = showDiff
    ? score > 0
      ? `+${formattedScore}`
      : `${score < 0 ? '-' : ''}${formattedScore}`
    : score < 0
      ? `-${formattedScore}`
      : formattedScore;

  return (
    <span
      className={`
      ${styles.score} 
      ${styles[size]} 
      ${showDiff && isPositive ? styles.positive : ''} 
      ${showDiff && isNegative ? styles.negative : ''}
      ${className || ''}
    `}
    >
      {formatted}
    </span>
  );
};
