import type { TileCode } from '../../types/analysis';
import { getTileMetadata } from '../../utils/tiles';
import styles from './TileImage.module.css';

interface TileImageProps {
  code: TileCode;
  size?: 'sm' | 'md' | 'lg';
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
  selected = false,
  pressed,
  onClick,
  disabled = false,
  ariaLabel,
  className,
}: TileImageProps) => {
  const tile = getTileMetadata(code);
  const tileClassName = joinClassNames(
    styles.tile,
    styles[size],
    styles[tile.group],
    selected && styles.selected,
    onClick && styles.clickable,
    className,
  );

  const content = (
    <>
      <span className={styles.header}>
        {!tile.isHonor ? (
          <span className={joinClassNames(styles.cornerValue, tile.isRed && styles.redValue)}>
            {tile.rankLabel}
          </span>
        ) : (
          <span className={styles.cornerLabel}>字牌</span>
        )}
        {tile.isRed ? <span className={styles.redBadge}>赤</span> : null}
      </span>
      <span className={joinClassNames(styles.symbol, tile.isHonor && styles.honorSymbol)}>
        {tile.symbol}
      </span>
      {!tile.isHonor ? (
        <span className={joinClassNames(styles.footerValue, tile.isRed && styles.redValue)}>
          {tile.rankLabel}
        </span>
      ) : (
        <span className={styles.footerLabel}>{tile.label}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={tileClassName}
        aria-label={ariaLabel ?? tile.label}
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
    <span className={tileClassName} role="img" aria-label={tile.label} title={tile.label}>
      {content}
    </span>
  );
};
