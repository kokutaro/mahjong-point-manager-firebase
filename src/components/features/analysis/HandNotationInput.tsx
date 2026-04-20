import { useMemo, useState } from 'react';
import type {
  AnalysisEventType,
  AnalysisWaits,
  Meld,
  ParsedHand,
  TileCode,
  WinningTileSource,
} from '../../../types';
import { WAIT_CATEGORY_DEFS } from '../../../types/analysis';
import { getTileLabel, normalizeTileCode } from '../../../utils/tiles';
import {
  type ParseResult,
  formatHandNotation,
  parseHandNotation,
} from '../../../utils/handNotation';
import { getSidewaysIndex, isAnkanBackTile } from '../../../utils/meldLayout';
import { detectHandWaits } from '../../../utils/waits';
import { TileImage } from '../../ui/TileImage';
import styles from './HandNotationInput.module.css';

const FROM_LABELS: Record<string, string> = {
  kamicha: '上家',
  toimen: '対面',
  shimocha: '下家',
};

interface HandNotationInputProps {
  concealed: TileCode[];
  melds: Meld[];
  winningTile?: TileCode;
  winningTileSource?: WinningTileSource;
  waits?: AnalysisWaits;
  storedSnapshot?: {
    concealed: TileCode[];
    melds: Meld[];
    winningTile?: TileCode;
    winningTileSource?: WinningTileSource;
    waits?: AnalysisWaits;
  };
  eventType: AnalysisEventType;
  readOnly: boolean;
  onParsed: (result: {
    concealed: TileCode[];
    melds: Meld[];
    tsumo?: TileCode;
    ron?: { tile: TileCode; from: 'kamicha' | 'toimen' | 'shimocha' };
  }) => void;
  onWaitsChange?: (waits: AnalysisWaits | undefined) => void;
}

const buildParsedHand = ({
  concealed,
  melds,
  winningTile,
  winningTileSource,
}: Pick<
  HandNotationInputProps,
  'concealed' | 'melds' | 'winningTile' | 'winningTileSource'
>): ParsedHand | null => {
  if (concealed.length === 0 && melds.length === 0) {
    return null;
  }

  const parsedHand: ParsedHand = {
    concealed: [...concealed],
    melds: [...melds],
  };

  if (winningTile && winningTileSource === 'tsumo') {
    parsedHand.tsumo = winningTile;
  } else if (winningTile && winningTileSource && winningTileSource !== 'tsumo') {
    parsedHand.ron = { tile: winningTile, from: winningTileSource };
  } else if (winningTile && !parsedHand.concealed.includes(winningTile)) {
    parsedHand.concealed = [...parsedHand.concealed, winningTile];
  }

  return parsedHand;
};

const TilePreview = ({ code }: { code: TileCode }) => <TileImage code={code} size="sm" />;

const MeldGroupPreview = ({ meld }: { meld: Meld }) => {
  const sidewaysIndex = getSidewaysIndex(meld);

  if (meld.kind === 'ankan') {
    return (
      <span className={styles.meldGroup}>
        {meld.tiles.map((tile, i) => (
          <span key={`meld-${tile}-${i}`} className={styles.meldTileWrapper}>
            <TileImage code={tile} size="sm" showBack={isAnkanBackTile(i)} />
          </span>
        ))}
      </span>
    );
  }

  if (meld.kind === 'kakan') {
    const baseTiles = meld.tiles.slice(0, 3) as [TileCode, TileCode, TileCode];
    const kakanTile = meld.tiles[3];
    return (
      <span className={styles.meldGroup}>
        {baseTiles.map((tile, i) => (
          <span
            key={`meld-${tile}-${i}`}
            className={i === sidewaysIndex ? styles.kakanStack : styles.meldTileWrapper}
          >
            {i === sidewaysIndex ? (
              <>
                <span className={styles.sideways}>
                  <TileImage code={tile} size="sm" />
                </span>
                <span className={`${styles.sideways} ${styles.kakanOverlay}`}>
                  <TileImage code={kakanTile} size="sm" />
                </span>
              </>
            ) : (
              <TileImage code={tile} size="sm" />
            )}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={styles.meldGroup}>
      {meld.tiles.map((tile, i) => (
        <span key={`meld-${tile}-${i}`} className={styles.meldTileWrapper}>
          {i === sidewaysIndex ? (
            <span className={styles.sideways}>
              <TileImage code={tile} size="sm" />
            </span>
          ) : (
            <TileImage code={tile} size="sm" />
          )}
        </span>
      ))}
    </span>
  );
};

const buildWaitDetectionResult = (
  parsedHand: ParsedHand,
  eventType: AnalysisEventType,
): AnalysisWaits | undefined => {
  return detectHandWaits({
    eventType,
    hand: {
      concealed: parsedHand.concealed,
      melds: parsedHand.melds,
      ...(parsedHand.tsumo
        ? { winningTile: parsedHand.tsumo }
        : parsedHand.ron
          ? { winningTile: parsedHand.ron.tile }
          : {}),
    },
  });
};

const buildParsedHandSignature = (parsedHand: ParsedHand | null) => {
  if (!parsedHand) {
    return null;
  }

  return JSON.stringify({
    concealed: [...parsedHand.concealed].map(normalizeTileCode).sort(),
    melds: parsedHand.melds
      .map((meld) => {
        const from = 'from' in meld ? (meld.from ?? '') : '';
        const tiles = [...meld.tiles].map(normalizeTileCode).sort().join(',');

        return `${meld.kind}:${from}:${tiles}`;
      })
      .sort(),
    winningTile: parsedHand.tsumo
      ? normalizeTileCode(parsedHand.tsumo)
      : parsedHand.ron
        ? normalizeTileCode(parsedHand.ron.tile)
        : undefined,
  });
};

export const HandNotationInput = ({
  concealed,
  melds,
  winningTile,
  winningTileSource,
  waits,
  storedSnapshot,
  eventType,
  readOnly,
  onParsed,
  onWaitsChange,
}: HandNotationInputProps) => {
  const initialHand = buildParsedHand({ concealed, melds, winningTile, winningTileSource });
  const storedHand = buildParsedHand({
    concealed: storedSnapshot?.concealed ?? concealed,
    melds: storedSnapshot?.melds ?? melds,
    winningTile: storedSnapshot?.winningTile,
    winningTileSource: storedSnapshot?.winningTileSource,
  });

  const [notation, setNotation] = useState(() => {
    if (!initialHand) return '';
    return formatHandNotation(initialHand);
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [hasUserEditedNotation, setHasUserEditedNotation] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(() => {
    if (!initialHand) return null;
    return { success: true, hand: initialHand };
  });
  const detectedWaits = useMemo(() => {
    if (!parsed || !parsed.success) {
      return undefined;
    }

    return buildWaitDetectionResult(parsed.hand, eventType);
  }, [eventType, parsed]);

  const storedHandSignature = useMemo(() => buildParsedHandSignature(storedHand), [storedHand]);
  const parsedHandSignature = useMemo(() => {
    if (!parsed || !parsed.success) {
      return null;
    }

    return buildParsedHandSignature(parsed.hand);
  }, [parsed]);
  const matchesInitialHand =
    storedHandSignature !== null &&
    parsedHandSignature !== null &&
    storedHandSignature === parsedHandSignature;

  const displayedWaits =
    hasUserEditedNotation && !matchesInitialHand
      ? detectedWaits
      : (storedSnapshot?.waits ?? waits ?? detectedWaits);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNotation(value);
    setHasUserEditedNotation(true);

    if (value.trim() === '') {
      setParseError(null);
      setParsed(null);
      onParsed({ concealed: [], melds: [] });
      onWaitsChange?.(undefined);
      return;
    }

    const result = parseHandNotation(value);
    setParsed(result);
    if (result.success) {
      setParseError(null);
      const nextWaits =
        storedSnapshot?.waits && buildParsedHandSignature(result.hand) === storedHandSignature
          ? storedSnapshot.waits
          : buildWaitDetectionResult(result.hand, eventType);
      onWaitsChange?.(nextWaits);
      onParsed({
        concealed: result.hand.concealed,
        melds: result.hand.melds,
        tsumo: result.hand.tsumo,
        ron: result.hand.ron,
      });
    } else {
      setParseError(result.error.message);
      onWaitsChange?.(undefined);
    }
  };

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
          <div className={styles.previewContainer}>
            <div className={styles.previewRow}>
              {parsed.hand.concealed.map((tile, i) => (
                <TilePreview key={`c-${tile}-${i}`} code={tile} />
              ))}

              {parsed.hand.tsumo ? (
                <>
                  <span className={styles.tileSeparator} />
                  <TilePreview code={parsed.hand.tsumo} />
                  <span className={styles.tsumoMarker}>ツモ</span>
                </>
              ) : null}

              {parsed.hand.ron ? (
                <>
                  <span className={styles.tileSeparator} />
                  <TilePreview code={parsed.hand.ron.tile} />
                  <span className={styles.ronMarker}>
                    ロン({FROM_LABELS[parsed.hand.ron.from]})
                  </span>
                </>
              ) : null}
            </div>
            {parsed.hand.melds.length > 0 ? (
              <div className={styles.previewMeldRow}>
                {parsed.hand.melds.map((meld, i) => (
                  <MeldGroupPreview key={`m-${i}`} meld={meld} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {parsed &&
      parsed.success &&
      displayedWaits &&
      (displayedWaits.tiles.length > 0 || displayedWaits.categories.length > 0) ? (
        <div className={styles.waitSection}>
          <div className={styles.waitHeader}>
            <span className={styles.previewLabel}>待ち</span>
            <span className={styles.waitMeta}>
              {displayedWaits.kind === 'auto'
                ? '自動判定'
                : displayedWaits.kind === 'legacy'
                  ? '保存済み'
                  : '未解決'}
            </span>
          </div>
          {displayedWaits.tiles.length > 0 ? (
            <div className={styles.waitList}>
              {displayedWaits.tiles.map((waitTile) => (
                <div key={waitTile.tile} className={styles.waitItem}>
                  <div className={styles.waitTileRow}>
                    <TilePreview code={waitTile.tile} />
                    <span className={styles.waitTileLabel}>{getTileLabel(waitTile.tile)}</span>
                  </div>
                  <div className={styles.waitBadgeRow}>
                    {waitTile.categories.map((category) => (
                      <span key={`${waitTile.tile}-${category}`} className={styles.waitBadge}>
                        {WAIT_CATEGORY_DEFS[category].label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.waitFallback}>
              <span className={styles.waitFallbackText}>待ち牌情報なし</span>
              <div className={styles.waitBadgeRow}>
                {displayedWaits.categories.map((category) => (
                  <span key={`legacy-${category}`} className={styles.waitBadge}>
                    {WAIT_CATEGORY_DEFS[category].label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {notation.trim() !== '' &&
      (!parsed || !parsed.success || displayedWaits?.kind === 'unresolved') ? (
        <p className={styles.waitHint}>待ちを自動判定できませんでした</p>
      ) : null}

      <p className={styles.helpText}>
        MPSZ形式: m=萬子, p=筒子, s=索子, z=字牌(1東2南3西4北5白6發7中)。
        赤5は5r。ツモは末尾に_、ロンは-/=/+。鳴きはカンマ区切り。
      </p>
    </div>
  );
};
