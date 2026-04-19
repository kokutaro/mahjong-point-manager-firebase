import type { TileCode } from '../../types/analysis';
import { getTileImageAssetPaths, getTileMetadata, type TileTheme } from '../../utils/tiles';
import styles from './TileImage.module.css';

interface TileImageProps {
  code: TileCode;
  size?: 'sm' | 'md' | 'lg';
  theme?: TileTheme;
  selected?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const joinClassNames = (...values: Array<string | false | null | undefined>): string => {
  return values.filter(Boolean).join(' ');
};

export const TileImage = ({
  code,
  size = 'md',
  theme = 'light',
  selected = false,
  pressed,
  onClick,
  disabled = false,
  ariaLabel,
  className,
}: TileImageProps) => {
  const tile = getTileMetadata(code);
  const assetPaths = getTileImageAssetPaths(code, theme);
  const tileClassName = joinClassNames(
    styles.tile,
    styles[size],
    selected && styles.selected,
    pressed && styles.pressed,
    onClick && styles.clickable,
    className,
  );
  const accessibleLabel = ariaLabel ?? tile.label;

  const content = (
    <span className={styles.stack}>
      <img
        className={joinClassNames(styles.layer, styles.frontLayer)}
        src={assetPaths.frontPath}
        alt=""
        aria-hidden="true"
      />
      <img
        className={joinClassNames(styles.layer, styles.faceLayer)}
        src={assetPaths.facePath}
        alt=""
        aria-hidden="true"
      />
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={tileClassName}
        aria-label={accessibleLabel}
        aria-pressed={pressed}
        title={tile.label}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={tileClassName} role="img" aria-label={accessibleLabel} title={tile.label}>
      {content}
    </span>
  );
};
