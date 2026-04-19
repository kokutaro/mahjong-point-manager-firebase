import { useCallback, useState } from 'react';
import type { Meld, TileCode } from '../../../types';
import { getTileLabel, getTileSvgPath } from '../../../utils/tiles';
import {
  type ParseResult,
  formatHandNotation,
  parseHandNotation,
} from '../../../utils/handNotation';
import styles from './HandNotationInput.module.css';

const FROM_LABELS: Record<string, string> = {
  kamicha: '上家',
  toimen: '対面',
  shimocha: '下家',
};

interface HandNotationInputProps {
  concealed: TileCode[];
  melds: Meld[];
  readOnly: boolean;
  onParsed: (result: {
    concealed: TileCode[];
    melds: Meld[];
    tsumo?: TileCode;
    ron?: { tile: TileCode; from: 'kamicha' | 'toimen' | 'shimocha' };
  }) => void;
}

const TileSvg = ({ code }: { code: TileCode }) => (
  <img
    className={styles.tileImg}
    src={getTileSvgPath(code, 'light')}
    alt={getTileLabel(code)}
    draggable={false}
  />
);

const MeldGroupPreview = ({ meld }: { meld: Meld }) => (
  <span className={styles.meldGroup}>
    {meld.tiles.map((tile, i) => (
      <TileSvg key={`meld-${tile}-${i}`} code={tile} />
    ))}
    {'from' in meld && meld.from ? (
      <span className={styles.ronMarker}>{FROM_LABELS[meld.from]}</span>
    ) : null}
  </span>
);

export const HandNotationInput = ({
  concealed,
  melds,
  readOnly,
  onParsed,
}: HandNotationInputProps) => {
  const [notation, setNotation] = useState(() => {
    if (concealed.length === 0 && melds.length === 0) return '';
    return formatHandNotation({ concealed, melds });
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(() => {
    if (concealed.length === 0 && melds.length === 0) return null;
    return parseHandNotation(formatHandNotation({ concealed, melds }));
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNotation(value);

      if (value.trim() === '') {
        setParseError(null);
        setParsed(null);
        onParsed({ concealed: [], melds: [] });
        return;
      }

      const result = parseHandNotation(value);
      setParsed(result);
      if (result.success) {
        setParseError(null);
        onParsed({
          concealed: result.hand.concealed,
          melds: result.hand.melds,
          tsumo: result.hand.tsumo,
          ron: result.hand.ron,
        });
      } else {
        setParseError(result.error.message);
      }
    },
    [onParsed],
  );

  const inputClassName = [styles.notationInput, parseError ? styles.notationInputError : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.container}>
      <div className={styles.inputRow}>
        <input
          type="text"
          className={inputClassName}
          value={notation}
          onChange={handleChange}
          placeholder="例: m123p456s789z11s2_"
          maxLength={100}
          disabled={readOnly}
          aria-label="MPSZ形式で手牌を入力"
          aria-invalid={parseError ? true : undefined}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className={styles.errorMessage} role="alert">
        {parseError ?? ''}
      </div>

      <div className={styles.previewSection}>
        <span className={styles.previewLabel}>プレビュー</span>

        {parsed === null || !parsed.success ? (
          <div className={styles.previewRow}>
            <span className={styles.emptyPreview}>
              {notation.trim() === '' ? '手牌を入力してください' : 'パースエラー'}
            </span>
          </div>
        ) : (
          <div className={styles.previewRow}>
            {parsed.hand.concealed.map((tile, i) => (
              <TileSvg key={`c-${tile}-${i}`} code={tile} />
            ))}

            {parsed.hand.tsumo ? (
              <>
                <span className={styles.tileSeparator} />
                <TileSvg code={parsed.hand.tsumo} />
                <span className={styles.tsumoMarker}>ツモ</span>
              </>
            ) : null}

            {parsed.hand.ron ? (
              <>
                <span className={styles.tileSeparator} />
                <TileSvg code={parsed.hand.ron.tile} />
                <span className={styles.ronMarker}>ロン({FROM_LABELS[parsed.hand.ron.from]})</span>
              </>
            ) : null}

            {parsed.hand.melds.length > 0 ? (
              <>
                <span className={styles.tileSeparator} />
                {parsed.hand.melds.map((meld, i) => (
                  <MeldGroupPreview key={`m-${i}`} meld={meld} />
                ))}
              </>
            ) : null}
          </div>
        )}
      </div>

      <p className={styles.helpText}>
        MPSZ形式: m=萬子, p=筒子, s=索子, z=字牌(1東2南3西4北5白6發7中)。
        赤5は5r。ツモは末尾に_、ロンは-/=/+。鳴きはカンマ区切り。
      </p>
    </div>
  );
};
