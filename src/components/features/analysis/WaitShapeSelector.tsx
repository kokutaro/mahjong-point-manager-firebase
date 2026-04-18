import type { WaitShape } from '../../../types';
import { WAIT_SHAPE_DEFS, WAIT_SHAPES } from '../../../types';
import styles from './WaitShapeSelector.module.css';

interface WaitShapeSelectorProps {
  selected: WaitShape[];
  readOnly: boolean;
  onChange: (waits: WaitShape[]) => void;
}

export const WaitShapeSelector = ({ selected, readOnly, onChange }: WaitShapeSelectorProps) => {
  return (
    <div className={styles.grid}>
      {WAIT_SHAPES.map((waitShape) => {
        const isSelected = selected.includes(waitShape);

        return (
          <button
            key={waitShape}
            type="button"
            className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
            onClick={() => {
              onChange(
                isSelected
                  ? selected.filter((currentWait) => currentWait !== waitShape)
                  : [...selected, waitShape],
              );
            }}
            disabled={readOnly}
            aria-label={`待ち形 ${WAIT_SHAPE_DEFS[waitShape].label}`}
            aria-pressed={isSelected}
          >
            {WAIT_SHAPE_DEFS[waitShape].label}
          </button>
        );
      })}
    </div>
  );
};
