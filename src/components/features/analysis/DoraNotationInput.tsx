import { useCallback, useState } from 'react';
import type { TileCode } from '../../../types';
import { getTileLabel, getTileSvgPath } from '../../../utils/tiles';
import {
  type TileListParseResult,
  formatTileListNotation,
  parseTileListNotation,
} from '../../../utils/handNotation';
import styles from './DoraNotationInput.module.css';

interface DoraNotationInputProps {
  value: TileCode[];
  label: string;
  maxTiles?: number;
  readOnly?: boolean;
  onChange: (tiles: TileCode[]) => void;
}

const TileSvg = ({ code }: { code: TileCode }) => (
  <img
    className={styles.tileImg}
    src={getTileSvgPath(code, 'light')}
    alt={getTileLabel(code)}
    draggable={false}
  />
);

export const DoraNotationInput = ({
  value,
  label,
  maxTiles,
  readOnly = false,
  onChange,
}: DoraNotationInputProps) => {
  const [notation, setNotation] = useState(() => formatTileListNotation(value));
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedTiles, setParsedTiles] = useState<TileCode[]>(value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setNotation(raw);

      if (raw.trim() === '') {
        setParseError(null);
        setParsedTiles([]);
        onChange([]);
        return;
      }

      const result: TileListParseResult = parseTileListNotation(raw, maxTiles);
      if (result.success) {
        setParseError(null);
        setParsedTiles(result.tiles);
        onChange(result.tiles);
      } else {
        setParseError(result.error.message);
      }
    },
    [maxTiles, onChange],
  );

  const inputClassName = [styles.notationInput, parseError ? styles.notationInputError : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.container}>
      <p className={styles.fieldLabel}>{label}</p>
      <div className={styles.inputRow}>
        <input
          type="text"
          className={inputClassName}
          value={notation}
          onChange={handleChange}
          placeholder="例: m1p5r"
          maxLength={50}
          disabled={readOnly}
          aria-label={label}
          aria-invalid={parseError ? true : undefined}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className={styles.errorMessage} role="alert">
        {parseError ?? ''}
      </div>

      <div className={styles.previewRow}>
        {parsedTiles.length === 0 ? (
          <span className={styles.emptyPreview}>
            {notation.trim() === '' ? '未入力' : 'パースエラー'}
          </span>
        ) : (
          parsedTiles.map((tile, i) => <TileSvg key={`${tile}-${i}`} code={tile} />)
        )}
      </div>
    </div>
  );
};
