import type { AnalysisEventSummary } from '../../utils/analysisEvents';
import styles from './AnalysisEventList.module.css';

interface AnalysisEventListProps {
  events: AnalysisEventSummary[];
  savedHandLogIds?: Set<string>;
  emptyMessage?: string;
  onSelect: (event: AnalysisEventSummary) => void;
}

const getScoreClassName = (scoreDeltaLabel: string): string => {
  if (scoreDeltaLabel.startsWith('+')) {
    return styles.positive;
  }

  if (scoreDeltaLabel.startsWith('-')) {
    return styles.negative;
  }

  return styles.zero;
};

export const AnalysisEventList = ({
  events,
  savedHandLogIds,
  emptyMessage = '分析対象のイベントはありません。',
  onSelect,
}: AnalysisEventListProps) => {
  if (events.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

  return (
    <div className={styles.list}>
      {events.map((event) => {
        const hasEntry = savedHandLogIds?.has(event.source.handLogId) ?? false;

        return (
          <button
            key={event.id}
            type="button"
            className={styles.item}
            onClick={() => onSelect(event)}
            aria-label={`${event.roundLabel} ${event.eventLabel}`}
          >
            <div className={styles.header}>
              <div className={styles.title}>
                <span className={styles.round}>{event.roundLabel}</span>
                <span className={styles.eventBadge}>{event.eventLabel}</span>
              </div>
              <span
                className={`${styles.entryBadge} ${hasEntry ? styles.entrySaved : styles.entryMissing}`}
              >
                {hasEntry ? 'ノートあり' : '未入力'}
              </span>
            </div>
            <div className={styles.meta}>
              <span>{event.locationLabel}</span>
              <span className={`${styles.score} ${getScoreClassName(event.scoreDeltaLabel)}`}>
                {event.scoreDeltaLabel}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summary}>{event.summary}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
