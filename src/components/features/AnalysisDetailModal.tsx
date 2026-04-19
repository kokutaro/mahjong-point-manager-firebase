import { useMemo, useState } from 'react';
import type { AnalysisDora, AnalysisEntry, Meld, TileCode } from '../../types';
import { TILE_GROUPS } from '../../utils/tiles';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TileImage } from '../ui/TileImage';
import { HandInputSection } from './analysis/HandInputSection';
import { MeldEditor } from './analysis/MeldEditor';
import { WaitShapeSelector } from './analysis/WaitShapeSelector';
import { YakuSelector } from './analysis/YakuSelector';
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
    wait: [...entry.hand.wait],
  },
  dora: {
    doraIndicators: [...entry.dora.doraIndicators],
    uraIndicators: [...entry.dora.uraIndicators],
    kanDoraIndicators: [...entry.dora.kanDoraIndicators],
    kanUraIndicators: [...entry.dora.kanUraIndicators],
    redFiveCount: entry.dora.redFiveCount,
  },
  yaku: {
    ...entry.yaku,
    list: [...entry.yaku.list],
    yakuman: [...entry.yaku.yakuman],
  },
});

const getEntryIdentity = (entry: AnalysisEntry) => {
  return [entry.id, entry.source.kind, entry.source.handLogId].join(':');
};

const getTileCount = (entry: AnalysisEntry) => {
  const meldTileCount = entry.hand.melds.reduce((total, meld) => total + meld.tiles.length, 0);
  return entry.hand.concealed.length + meldTileCount;
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

  if (
    entry.context.eventType !== 'tenpai-draw' &&
    entry.hand.winningTile &&
    !entry.hand.concealed.includes(entry.hand.winningTile)
  ) {
    warnings.push('和了牌は手牌内の牌から選択してください');
  }

  if (tileCount > 0 && tileCount !== expectedTileCount) {
    warnings.push(`牌数が ${tileCount} 枚です（目安: ${expectedTileCount} 枚）`);
  }

  return warnings;
};

const updateTileList = (tiles: TileCode[], tile: TileCode): TileCode[] => {
  return [...tiles, tile];
};

const removeTileAt = (tiles: TileCode[], index: number): TileCode[] => {
  return tiles.filter((_, currentIndex) => currentIndex !== index);
};

interface TileCollectionEditorProps {
  label: string;
  tiles: TileCode[];
  readOnly: boolean;
  onAdd: (tile: TileCode) => void;
  onRemove: (index: number) => void;
}

const TileCollectionEditor = ({
  label,
  tiles,
  readOnly,
  onAdd,
  onRemove,
}: TileCollectionEditorProps) => {
  return (
    <div className={styles.tileEditor}>
      <div className={styles.fieldHeader}>
        <h4>{label}</h4>
        <span>{tiles.length}枚</span>
      </div>
      <div className={styles.tileList}>
        {tiles.length === 0 ? <span className={styles.emptyText}>未入力</span> : null}
        {tiles.map((tile, index) => (
          <TileImage
            key={`${label}-${tile}-${index}`}
            code={tile}
            size="sm"
            selected
            onClick={() => onRemove(index)}
            disabled={readOnly}
            ariaLabel={`${label}から${tile}を削除`}
          />
        ))}
      </div>
      <div className={styles.tilePalette}>
        {TILE_GROUPS.map((group) => (
          <div key={group.label} className={styles.tilePaletteGroup}>
            <span className={styles.tilePaletteLabel}>{group.label}</span>
            <div className={styles.tilePaletteButtons}>
              {group.tiles.map((tile) => (
                <TileImage
                  key={`${label}-${tile}`}
                  code={tile}
                  size="sm"
                  onClick={() => onAdd(tile)}
                  disabled={readOnly}
                  ariaLabel={`${label}に${tile}を追加`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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

  const updateDoraSection = (key: keyof AnalysisDora, nextTiles: TileCode[]) => {
    updateDraft((current) => ({
      ...current,
      dora: {
        ...current.dora,
        [key]: nextTiles,
      },
    }));
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
          ? { winningTile: undefined }
          : draft.hand.winningTile && draft.hand.concealed.includes(draft.hand.winningTile)
            ? { winningTile: draft.hand.winningTile }
            : {}),
      },
      notes: draft.notes.trim(),
    });

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
        />

        <MeldEditor melds={draft.hand.melds} readOnly={true} onChange={() => {}} />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>待ち形</h3>
          </div>
          <WaitShapeSelector
            selected={draft.hand.wait}
            readOnly={readOnly || isBusy}
            onChange={(wait) => {
              updateDraft((current) => ({
                ...current,
                hand: {
                  ...current.hand,
                  wait,
                },
              }));
            }}
          />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>ドラ</h3>
          </div>
          <div className={styles.tileEditorGrid}>
            <TileCollectionEditor
              label="ドラ表示牌"
              tiles={draft.dora.doraIndicators}
              readOnly={readOnly || isBusy}
              onAdd={(tile) =>
                updateDoraSection('doraIndicators', updateTileList(draft.dora.doraIndicators, tile))
              }
              onRemove={(index) =>
                updateDoraSection('doraIndicators', removeTileAt(draft.dora.doraIndicators, index))
              }
            />
            <TileCollectionEditor
              label="裏ドラ表示牌"
              tiles={draft.dora.uraIndicators}
              readOnly={readOnly || isBusy}
              onAdd={(tile) =>
                updateDoraSection('uraIndicators', updateTileList(draft.dora.uraIndicators, tile))
              }
              onRemove={(index) =>
                updateDoraSection('uraIndicators', removeTileAt(draft.dora.uraIndicators, index))
              }
            />
            <TileCollectionEditor
              label="槓ドラ表示牌"
              tiles={draft.dora.kanDoraIndicators}
              readOnly={readOnly || isBusy}
              onAdd={(tile) =>
                updateDoraSection(
                  'kanDoraIndicators',
                  updateTileList(draft.dora.kanDoraIndicators, tile),
                )
              }
              onRemove={(index) =>
                updateDoraSection(
                  'kanDoraIndicators',
                  removeTileAt(draft.dora.kanDoraIndicators, index),
                )
              }
            />
            <TileCollectionEditor
              label="槓裏ドラ表示牌"
              tiles={draft.dora.kanUraIndicators}
              readOnly={readOnly || isBusy}
              onAdd={(tile) =>
                updateDoraSection(
                  'kanUraIndicators',
                  updateTileList(draft.dora.kanUraIndicators, tile),
                )
              }
              onRemove={(index) =>
                updateDoraSection(
                  'kanUraIndicators',
                  removeTileAt(draft.dora.kanUraIndicators, index),
                )
              }
            />
          </div>
          <div className={styles.inlineField}>
            <label className={styles.inputLabel} htmlFor="analysis-red-five-count">
              赤5枚数
            </label>
            <input
              id="analysis-red-five-count"
              className={styles.numberInput}
              type="number"
              min={0}
              value={draft.dora.redFiveCount}
              onChange={(event) => {
                const nextValue = Number.parseInt(event.target.value, 10);
                updateDraft((current) => ({
                  ...current,
                  dora: {
                    ...current.dora,
                    redFiveCount: Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0,
                  },
                }));
              }}
              disabled={readOnly || isBusy}
            />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>役</h3>
          </div>
          <YakuSelector
            value={draft.yaku}
            readOnly={readOnly || isBusy}
            onChange={(yaku) => {
              updateDraft((current) => ({
                ...current,
                yaku,
              }));
            }}
          />
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
