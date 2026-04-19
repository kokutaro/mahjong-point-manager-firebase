import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalysisDetailModal } from '../components/features/AnalysisDetailModal';
import { Button } from '../components/ui/Button';
import { useAnalysisEntries } from '../hooks/useAnalysisEntries';
import { useAnalysisEntry } from '../hooks/useAnalysisEntry';
import {
  YAKU_DEFS,
  YAKUMAN_DEFS,
  type AnalysisEventType,
  type AnalysisEntry,
} from '../types/analysis';
import { getTimestampValue } from '../utils/analysisEvents';
import styles from './AnalysisListPage.module.css';

type FilterPeriod = 'all' | '7d' | '30d' | '90d';
type ModalMode = 'view' | 'edit';

const EVENT_LABELS: Record<AnalysisEventType, string> = {
  win: '和了',
  'deal-in': '放銃',
  'tenpai-draw': 'テンパイ流局',
};

const PERIOD_LABELS: Record<FilterPeriod, string> = {
  all: 'すべて',
  '7d': '7日以内',
  '30d': '30日以内',
  '90d': '90日以内',
};

const PERIOD_TO_MS: Record<Exclude<FilterPeriod, 'all'>, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

const formatRoundLabel = (entry: ReturnType<typeof useAnalysisEntries>['entries'][number]) => {
  const windLabel = { East: '東', South: '南', West: '西', North: '北' }[entry.context.round.wind];
  return `${windLabel}${entry.context.round.number}局 ${entry.context.round.honba}本場`;
};

const formatUpdatedAtLabel = (updatedAt: number | object) => {
  const timestamp = getTimestampValue(updatedAt);
  if (timestamp === 0) {
    return '更新日時不明';
  }

  return new Date(timestamp).toLocaleString('ja-JP');
};

const formatYakuPreview = (entry: AnalysisEntry) => {
  const labels = [
    ...(entry.yaku.yakuman ?? []).map((yakumanId) => YAKUMAN_DEFS[yakumanId].label),
    ...(entry.yaku.list ?? []).map((yakuId) => YAKU_DEFS[yakuId].label),
  ].slice(0, 2);

  return labels.length > 0 ? labels.join(' / ') : '役未入力';
};

export const AnalysisListPage = () => {
  const navigate = useNavigate();
  const { entries, loading } = useAnalysisEntries();
  const [currentTime] = useState(() => Date.now());
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('all');
  const [eventFilter, setEventFilter] = useState<'all' | AnalysisEventType>('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');

  const {
    analysisEntry,
    loading: entryLoading,
    saving,
    deleting,
    saveAnalysisEntry,
    deleteAnalysisEntry,
  } = useAnalysisEntry({ entryId: selectedEntryId });

  const filteredEntries = useMemo(() => {
    return [...entries]
      .sort((left, right) => getTimestampValue(right.updatedAt) - getTimestampValue(left.updatedAt))
      .filter((entry) => {
        if (eventFilter !== 'all' && entry.context.eventType !== eventFilter) {
          return false;
        }

        if (periodFilter === 'all') {
          return true;
        }

        return currentTime - getTimestampValue(entry.updatedAt) <= PERIOD_TO_MS[periodFilter];
      });
  }, [currentTime, entries, eventFilter, periodFilter]);

  const closeModal = () => {
    setSelectedEntryId(null);
    setModalMode('view');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>分析ノート</h1>
          <span className={styles.subtitle}>保存済みの局面メモを絞り込んで振り返れます。</span>
        </div>
        <Button variant="secondary" onClick={() => navigate('/')}>
          トップへ
        </Button>
      </div>

      <section className={styles.filters}>
        <div className={styles.filterGrid}>
          <label className={styles.field}>
            <span>期間</span>
            <select
              className={styles.select}
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value as FilterPeriod)}
            >
              {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>イベント種別</span>
            <select
              className={styles.select}
              aria-label="イベント種別"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value as 'all' | AnalysisEventType)}
            >
              <option value="all">すべて</option>
              {Object.entries(EVENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? <div className={styles.empty}>読み込み中...</div> : null}

      {!loading ? (
        <div className={styles.list}>
          {filteredEntries.length === 0 ? (
            <div className={styles.empty}>条件に一致する分析ノートはありません。</div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className={styles.item}>
                <button
                  type="button"
                  className={styles.viewButton}
                  onClick={() => {
                    setSelectedEntryId(entry.id);
                    setModalMode('view');
                  }}
                  aria-label={`${formatRoundLabel(entry)} ${EVENT_LABELS[entry.context.eventType]}`}
                >
                  <div className={styles.itemHeader}>
                    <div>
                      <div className={styles.itemTitle}>{formatRoundLabel(entry)}</div>
                      <div className={styles.itemMeta}>
                        <span>{entry.source.kind === 'competition' ? '大会対局' : '通常対局'}</span>
                        <span>{formatUpdatedAtLabel(entry.updatedAt)}</span>
                      </div>
                    </div>
                    <span className={styles.chip}>{EVENT_LABELS[entry.context.eventType]}</span>
                  </div>
                  <div className={styles.notes}>{entry.notes || 'メモなし'}</div>
                </button>
                <div className={styles.itemFooter}>
                  <span className={styles.itemMeta}>{formatYakuPreview(entry)}</span>
                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setSelectedEntryId(entry.id);
                        setModalMode('edit');
                      }}
                    >
                      編集
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
      {selectedEntryId && analysisEntry && !entryLoading ? (
        <AnalysisDetailModal
          isOpen
          mode={modalMode}
          entry={analysisEntry}
          isSaving={saving}
          isDeleting={deleting}
          onClose={closeModal}
          onSave={
            modalMode === 'edit'
              ? async (entry) => {
                  await saveAnalysisEntry(entry);
                  closeModal();
                }
              : undefined
          }
          onDelete={
            modalMode === 'edit'
              ? async () => {
                  await deleteAnalysisEntry();
                  closeModal();
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
};
