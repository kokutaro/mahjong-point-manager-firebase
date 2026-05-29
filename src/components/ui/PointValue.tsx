import { formatPoint } from '../../utils/formatUtils';
import styles from './PointValue.module.css';

interface PointValueProps {
  value: number;
  className?: string;
}

export const PointValue = ({ value, className }: PointValueProps) => {
  const colorClass = value > 0 ? styles.positive : value < 0 ? styles.negative : styles.zero;

  return (
    <span className={`${styles.value} ${colorClass} ${className || ''}`}>{formatPoint(value)}</span>
  );
};
