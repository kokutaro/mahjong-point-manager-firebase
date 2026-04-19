import { useMemo, useState } from 'react';
import type { AnalysisEntry, AnalysisYaku, Meld, SpecialEnd } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { DoraNotationInput } from './analysis/DoraNotationInput';
import { HandInputSection } from './analysis/HandInputSection';
import { detectHandWaits } from '../../utils/waits';
import { normalizeTileCode } from '../../utils/tiles';
import styles from './AnalysisDetailModal.module.css';

export type AnalysisDetailMode = 'create' | 'edit' | 'view';

interface AnalysisDetailModalProps {
  isOpen: boolean;
  mode: AnalysisDetailMode;
  entry: AnalysisEntry;
  isSaving?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onSave?: (entry: AnalysisEntry) => Promise<void> | void;
  onDelete?: (entry: AnalysisEntry) => Promise<void> | void;
}

const EVENT_LABELS: Record<AnalysisEntry['context']['eventType'], string> = {
  win: '和了',
  'deal-in': '放銃',
  'tenpai-draw': 'テンパイ流局',
};

const WIND_LABELS: Record<AnalysisEntry['context']['round']['wind'], string> = {
  East: '東',
  South: '南',
  West: '西',
  North: '北',
};

const SPECIAL_LABELS: Record<NonNullable<AnalysisEntry['yaku']['special']>, string> = {
  haitei: '海底',
  houtei: '河底',
  rinshan: '嶺上開花',
  chankan: '槍槓',
};

const cloneMeld = (meld: Meld): Meld => {
  switch (meld.kind) {
    case 'chi':
    case 'pon':
      return {
        ...meld,
        tiles: [...meld.tiles] as typeof meld.tiles,
      };
    case 'minkan':
    case 'ankan':
    case 'kakan':
      return {
        ...meld,
        tiles: [...meld.tiles] as typeof meld.tiles,
      };
  }
};

const cloneEntry = (entry: AnalysisEntry): AnalysisEntry => ({
  ...entry,
  source: { ...entry.source },
  context: {
    ...entry.context,
    round: { ...entry.context.round },
  },
  hand: {
    concealed: [...entry.hand.concealed],
    melds: entry.hand.melds.map(cloneMeld),
    ...(entry.hand.winningTile ? { winningTile: entry.hand.winningTile } : {}),
    ...(entry.hand.winningTileSource ? { winningTileSource: entry.hand.winningTileSource } : {}),
    ...(entry.hand.waits
      ? {
          waits: {
            ...entry.hand.waits,
            tiles: entry.hand.waits.tiles.map((waitTile) => ({
              tile: waitTile.tile,
              categories: [...waitTile.categories],
            })),
            categories: [...entry.hand.waits.categories],
          },
        }
      : {}),
  },
  dora: {
    doraIndicators: [...entry.dora.doraIndicators],
    uraIndicators: [...entry.dora.uraIndicators],
    kanDoraIndicators: [...entry.dora.kanDoraIndicators],
    kanUraIndicators: [...entry.dora.kanUraIndicators],
    ...(entry.dora.redFiveCount !== undefined ? { redFiveCount: entry.dora.redFiveCount } : {}),
  },
  yaku: {
    ...entry.yaku,
    ...(entry.yaku.list ? { list: [...entry.yaku.list] } : {}),
    ...(entry.yaku.yakuman ? { yakuman: [...entry.yaku.yakuman] } : {}),
  },
});

const getEntryIdentity = (entry: AnalysisEntry) => {
  return [entry.id, entry.source.kind, entry.source.handLogId].join(':');
};

const getTileCount = (entry: AnalysisEntry) => {
  const meldTileCount = entry.hand.melds.reduce((total, meld) => total + meld.tiles.length, 0);
  const winningTileCount =
    entry.context.eventType === 'tenpai-draw' ||
    !entry.hand.winningTile ||
    entry.hand.concealed.includes(entry.hand.winningTile)
      ? 0
      : 1;

  return entry.hand.concealed.length + meldTileCount + winningTileCount;
};

const getWarnings = (entry: AnalysisEntry): string[] => {
  const warnings: string[] = [];
  const tileCount = getTileCount(entry);
  const expectedTileCount = entry.context.eventType === 'tenpai-draw' ? 13 : 14;

  if (tileCount === 0) {
    warnings.push('手牌が未入力です');
  }

  if (entry.context.eventType !== 'tenpai-draw' && !entry.hand.winningTile) {
    warnings.push('和了牌が未入力です');
  }

  if (tileCount > 0 && tileCount !== expectedTileCount) {
    warnings.push(`牌数が ${tileCount} 枚です（目安: ${expectedTileCount} 枚）`);
  }

  return warnings;
};

const buildDetectedWaits = (entry: AnalysisEntry): AnalysisEntry['hand']['waits'] => {
  return detectHandWaits({
    eventType: entry.context.eventType,
    hand: {
      concealed: entry.hand.concealed,
      melds: entry.hand.melds,
      ...(entry.hand.winningTile ? { winningTile: entry.hand.winningTile } : {}),
    },
  });
};

const buildWaitInputSignature = (entry: AnalysisEntry) => {
  const concealed = [...entry.hand.concealed].map(normalizeTileCode).sort();
  const melds = entry.hand.melds
    .map((meld) => {
      const from = 'from' in meld ? (meld.from ?? '') : '';
      const tiles = [...meld.tiles].map(normalizeTileCode).sort().join(',');

      return `${meld.kind}:${from}:${tiles}`;
    })
    .sort();

  return JSON.stringify({
    eventType: entry.context.eventType,
    concealed,
    melds,
    winningTile: entry.hand.winningTile ? normalizeTileCode(entry.hand.winningTile) : undefined,
  });
};

const shouldRecomputeWaits = (previousEntry: AnalysisEntry, nextEntry: AnalysisEntry) => {
  return buildWaitInputSignature(previousEntry) !== buildWaitInputSignature(nextEntry);
};

const areWaitsEqual = (
  left: AnalysisEntry['hand']['waits'],
  right: AnalysisEntry['hand']['waits'],
) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  if (left.kind !== right.kind || left.categories.length !== right.categories.length) {
    return false;
  }

  if (left.tiles.length !== right.tiles.length) {
    return false;
  }

  if (left.categories.some((category, index) => category !== right.categories[index])) {
    return false;
  }

  return left.tiles.every((tile, index) => {
    const otherTile = right.tiles[index];

    if (
      !otherTile ||
      tile.tile !== otherTile.tile ||
      tile.categories.length !== otherTile.categories.length
    ) {
      return false;
    }

    return tile.categories.every(
      (category, categoryIndex) => category === otherTile.categories[categoryIndex],
    );
  });
};

const SPECIAL_OPTIONS = [
  { value: 'none', label: 'なし' },
  { value: 'haitei', label: '海底' },
  { value: 'houtei', label: '河底' },
  { value: 'rinshan', label: '嶺上開花' },
  { value: 'chankan', label: '槍槓' },
] as const;

interface AnalysisDetailModalContentProps extends AnalysisDetailModalProps {
  entryIdentity: string;
}

const AnalysisDetailModalContent = ({
  isOpen,
  mode,
  entry,
  isSaving = false,
  isDeleting = false,
  onClose,
  onSave,
  onDelete,
}: AnalysisDetailModalContentProps) => {
  const [draft, setDraft] = useState<AnalysisEntry>(() => cloneEntry(entry));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const readOnly = mode === 'view';

  const warnings = useMemo(() => getWarnings(draft), [draft]);

  const isBusy = isSaving || isDeleting || isSubmitting || isRemoving;

  const updateDraft = (updater: (current: AnalysisEntry) => AnalysisEntry) => {
    setDraft((current) => updater(current));
  };

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    setDraft(cloneEntry(entry));
    onClose();
  };

  const handleSave = async () => {
    if (readOnly || !onSave || isBusy) {
      return;
    }

    const nextEntry = cloneEntry({
      ...draft,
      hand: {
        ...draft.hand,
        ...(draft.context.eventType === 'tenpai-draw'
          ? { winningTile: undefined, winningTileSource: undefined }
          : draft.hand.winningTile
            ? {
                winningTile: draft.hand.winningTile,
                ...(draft.hand.winningTileSource
                  ? { winningTileSource: draft.hand.winningTileSource }
                  : { winningTileSource: undefined }),
              }
            : { winningTile: undefined, winningTileSource: undefined }),
      },
      notes: draft.notes.trim(),
    });
    const detectedWaits = shouldRecomputeWaits(entry, nextEntry)
      ? buildDetectedWaits(nextEntry)
      : entry.hand.waits;

    nextEntry.hand = {
      ...nextEntry.hand,
      waits: detectedWaits,
    };

    setIsSubmitting(true);
    try {
      await onSave(nextEntry);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !onDelete || isBusy) {
      return;
    }

    setIsRemoving(true);
    try {
      await onDelete(cloneEntry(draft));
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? '分析メモを作成' : mode === 'edit' ? '分析メモを編集' : '分析メモ'}
      width="min(960px, calc(100vw - 16px))"
    >
      <div className={styles.layout}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>対象イベント概要</h3>
            <span className={styles.modeBadge}>{mode}</span>
          </div>
          <div className={styles.summaryGrid}>
            <div>
              <p className={styles.summaryLabel}>局面</p>
              <p className={styles.summaryValue}>
                {WIND_LABELS[draft.context.round.wind]}
                {draft.context.round.number}局 {draft.context.round.honba}本場
              </p>
            </div>
            <div>
              <p className={styles.summaryLabel}>イベント</p>
              <p className={styles.summaryValue}>{EVENT_LABELS[draft.context.eventType]}</p>
            </div>
            <div>
              <p className={styles.summaryLabel}>自風</p>
              <p className={styles.summaryValue}>自風: {WIND_LABELS[draft.context.seatWind]}</p>
            </div>
            <div>
              <p className={styles.summaryLabel}>場風</p>
              <p className={styles.summaryValue}>{WIND_LABELS[draft.context.roundWind]}</p>
            </div>
            <div>
              <p className={styles.summaryLabel}>ソース</p>
              <p className={styles.summaryValue}>
                ソース: {draft.source.kind} / {draft.source.handLogId}
              </p>
            </div>
            <div>
              <p className={styles.summaryLabel}>打点メモ</p>
              <p className={styles.summaryValue}>
                {draft.yaku.han ? `${draft.yaku.han}翻` : '翻数未入力'}
                {' / '}
                {draft.yaku.fu ? `${draft.yaku.fu}符` : '符未入力'}
                {' / '}
                {draft.yaku.special ? SPECIAL_LABELS[draft.yaku.special] : '通常'}
              </p>
            </div>
          </div>
        </section>

        {warnings.length > 0 ? (
          <section className={`${styles.section} ${styles.warningSection}`}>
            <div className={styles.sectionHeader}>
              <h3>警告</h3>
            </div>
            <p className={styles.warningLead}>入力は未完成ですが保存できます。</p>
            <ul className={styles.warningList}>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <HandInputSection
          concealed={draft.hand.concealed}
          melds={draft.hand.melds}
          winningTile={draft.hand.winningTile}
          winningTileSource={draft.hand.winningTileSource}
          waits={draft.hand.waits}
          storedSnapshot={{
            concealed: entry.hand.concealed,
            melds: entry.hand.melds,
            winningTile: entry.hand.winningTile,
            winningTileSource: entry.hand.winningTileSource,
            waits: entry.hand.waits,
          }}
          eventType={draft.context.eventType}
          readOnly={readOnly || isBusy}
          onConcealedChange={(concealed) => {
            updateDraft((current) => ({
              ...current,
              hand: {
                ...current.hand,
                concealed,
              },
            }));
          }}
          onMeldsChange={(melds) => {
            updateDraft((current) => ({
              ...current,
              hand: {
                ...current.hand,
                melds,
              },
            }));
          }}
          onWinningTileChange={(winningTile) => {
            updateDraft((current) => ({
              ...current,
              hand: {
                ...current.hand,
                ...(winningTile ? { winningTile } : { winningTile: undefined }),
              },
            }));
          }}
          onWinningTileSourceChange={(winningTileSource) => {
            updateDraft((current) => ({
              ...current,
              hand: {
                ...current.hand,
                ...(winningTileSource ? { winningTileSource } : { winningTileSource: undefined }),
              },
            }));
          }}
          onWaitsChange={(waits) => {
            updateDraft((current) => {
              if (areWaitsEqual(current.hand.waits, waits)) {
                return current;
              }

              return {
                ...current,
                hand: {
                  ...current.hand,
                  waits,
                },
              };
            });
          }}
        />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>ドラ</h3>
          </div>
          <div className={styles.tileEditorGrid}>
            <DoraNotationInput
              label="ドラ表示牌"
              value={draft.dora.doraIndicators}
              maxTiles={4}
              readOnly={readOnly || isBusy}
              onChange={(tiles) => {
                updateDraft((current) => ({
                  ...current,
                  dora: { ...current.dora, doraIndicators: tiles },
                }));
              }}
            />
            <DoraNotationInput
              label="裏ドラ表示牌"
              value={draft.dora.uraIndicators}
              maxTiles={4}
              readOnly={readOnly || isBusy}
              onChange={(tiles) => {
                updateDraft((current) => ({
                  ...current,
                  dora: { ...current.dora, uraIndicators: tiles },
                }));
              }}
            />
            <DoraNotationInput
              label="槓ドラ表示牌"
              value={draft.dora.kanDoraIndicators}
              maxTiles={4}
              readOnly={readOnly || isBusy}
              onChange={(tiles) => {
                updateDraft((current) => ({
                  ...current,
                  dora: { ...current.dora, kanDoraIndicators: tiles },
                }));
              }}
            />
            <DoraNotationInput
              label="槓裏ドラ表示牌"
              value={draft.dora.kanUraIndicators}
              maxTiles={4}
              readOnly={readOnly || isBusy}
              onChange={(tiles) => {
                updateDraft((current) => ({
                  ...current,
                  dora: { ...current.dora, kanUraIndicators: tiles },
                }));
              }}
            />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>和了条件</h3>
          </div>
          <div className={styles.metaGrid}>
            <label className={styles.metaField}>
              <span>立直状態</span>
              <select
                className={styles.selectInput}
                value={draft.yaku.riichi}
                onChange={(event) => {
                  const nextRiichi = event.target.value as AnalysisYaku['riichi'];
                  updateDraft((current) => ({
                    ...current,
                    yaku: { ...current.yaku, riichi: nextRiichi },
                  }));
                }}
                disabled={readOnly || isBusy}
              >
                <option value="none">なし</option>
                <option value="normal">通常立直</option>
                <option value="double">ダブル立直</option>
              </select>
            </label>

            <label className={styles.metaField}>
              <span>特殊和了</span>
              <select
                className={styles.selectInput}
                value={draft.yaku.special ?? 'none'}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  updateDraft((current) => ({
                    ...current,
                    yaku: {
                      ...current.yaku,
                      special: nextValue === 'none' ? null : (nextValue as SpecialEnd),
                    },
                  }));
                }}
                disabled={readOnly || isBusy}
              >
                {SPECIAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={draft.yaku.ippatsu}
                onChange={() => {
                  updateDraft((current) => ({
                    ...current,
                    yaku: { ...current.yaku, ippatsu: !current.yaku.ippatsu },
                  }));
                }}
                disabled={readOnly || isBusy}
              />
              <span>一発</span>
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>メモ</h3>
          </div>
          <label className={styles.textareaLabel} htmlFor="analysis-notes">
            メモ
          </label>
          <textarea
            id="analysis-notes"
            className={styles.textarea}
            value={draft.notes}
            onChange={(event) => {
              updateDraft((current) => ({
                ...current,
                notes: event.target.value,
              }));
            }}
            rows={5}
            readOnly={readOnly}
            disabled={isBusy}
            aria-label="メモ"
            placeholder="気づきや打牌理由を残す"
          />
        </section>

        <div className={styles.actions}>
          {mode === 'edit' && onDelete ? (
            <Button variant="danger" onClick={handleDelete} disabled={isBusy}>
              {isRemoving || isDeleting ? '削除中...' : '削除'}
            </Button>
          ) : null}
          <div className={styles.actionGroup}>
            <Button variant="secondary" onClick={handleClose} disabled={isBusy}>
              {readOnly ? '閉じる' : 'キャンセル'}
            </Button>
            {!readOnly && onSave ? (
              <Button variant="primary" onClick={handleSave} disabled={isBusy}>
                {isSubmitting || isSaving ? '保存中...' : '保存'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const AnalysisDetailModal = (props: AnalysisDetailModalProps) => {
  const entryIdentity = getEntryIdentity(props.entry);

  return (
    <AnalysisDetailModalContent key={entryIdentity} entryIdentity={entryIdentity} {...props} />
  );
};
