import type { TileCode } from '../../types/analysis';
import { TileImage } from '../ui/TileImage';
import styles from './TileRecognitionModal.module.css';

interface TilePickerProps {
  onPick: (code: TileCode) => void;
}

const MANZU: TileCode[] = ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'];
const PINZU: TileCode[] = ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'];
const SOUZU: TileCode[] = ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'];
const HONOR: TileCode[] = ['1z', '2z', '3z', '4z', '5z', '6z', '7z'];

/**
 * 1 牌の手修正用の選択パネル。萬/筒/索/字を一覧表示し、タップで `onPick` を呼ぶ。
 */
export const TilePicker = ({ onPick }: TilePickerProps) => {
  return (
    <div className={styles.pickerGrid}>
      <div className={styles.pickerSection}>萬子</div>
      {MANZU.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.tileSlot}
          onClick={() => onPick(c)}
          aria-label={c}
        >
          <TileImage code={c} size="sm" />
        </button>
      ))}
      <div className={styles.pickerSection}>筒子</div>
      {PINZU.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.tileSlot}
          onClick={() => onPick(c)}
          aria-label={c}
        >
          <TileImage code={c} size="sm" />
        </button>
      ))}
      <div className={styles.pickerSection}>索子</div>
      {SOUZU.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.tileSlot}
          onClick={() => onPick(c)}
          aria-label={c}
        >
          <TileImage code={c} size="sm" />
        </button>
      ))}
      <div className={styles.pickerSection}>字牌</div>
      {HONOR.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.tileSlot}
          onClick={() => onPick(c)}
          aria-label={c}
        >
          <TileImage code={c} size="sm" />
        </button>
      ))}
    </div>
  );
};
