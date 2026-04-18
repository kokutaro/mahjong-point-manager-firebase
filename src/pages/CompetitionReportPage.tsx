import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnalysisEventList } from '../components/features/AnalysisEventList';
import {
  AnalysisEventModalLauncher,
  type AnalysisModalSelection,
} from '../components/features/AnalysisEventModalLauncher';
import { Button } from '../components/ui/Button';
import { useAnalysisEntries } from '../hooks/useAnalysisEntries';
import { useCompetition } from '../hooks/useCompetition';
import {
  aggregateMatchDetails,
  aggregateOverallStandings,
  aggregateTableSummary,
} from '../utils/competitionReport';
import {
  downloadBlob,
  generateCsvBlob,
  generatePdfReport,
  generateReportFilename,
} from '../utils/exportReport';
import { formatAverageRank, formatPoint } from '../utils/formatUtils';
import { buildCompetitionAnalysisEvents } from '../utils/analysisEvents';
import styles from './CompetitionReportPage.module.css';

const pointClass = (pt: number): string => {
  if (pt > 0) return styles.positive;
  if (pt < 0) return styles.negative;
  return styles.zero;
};

export const CompetitionReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const { competition, participants, tables, gameResults, loading } = useCompetition(id ?? '');
  const { uid, entries: analysisEntries } = useAnalysisEntries();
  const [analysisSelection, setAnalysisSelection] = useState<AnalysisModalSelection | null>(null);

  const standings = useMemo(
    () => aggregateOverallStandings(gameResults, participants),
    [gameResults, participants],
  );

  const matchDetails = useMemo(
    () => aggregateMatchDetails(gameResults, participants),
    [gameResults, participants],
  );

  const tableSummary = useMemo(
    () => aggregateTableSummary(tables, participants, gameResults),
    [tables, participants, gameResults],
  );

  const analysisEvents = useMemo(() => {
    if (!id || !uid) {
      return [];
    }

    return buildCompetitionAnalysisEvents(id, gameResults, participants, uid);
  }, [gameResults, id, participants, uid]);

  const savedHandLogIds = useMemo(() => {
    return new Set(analysisEntries.map((entry) => entry.source.handLogId));
  }, [analysisEntries]);

  const useChip = competition?.settings.useChip ?? false;
  const isInProgress = competition?.status === 'in_progress';

  const handleCsvExport = () => {
    if (!competition) return;
    const blob = generateCsvBlob(standings, matchDetails, useChip);
    downloadBlob(blob, generateReportFilename(competition.name, 'csv'));
  };

  const handlePdfExport = () => {
    generatePdfReport();
  };

  if (!id) {
    return <div className={styles.center}>大会が見つかりません</div>;
  }

  if (loading) {
    return <div className={styles.center}>読み込み中...</div>;
  }

  if (!competition) {
    return <div className={styles.center}>大会が見つかりません</div>;
  }

  return (
    <div className={styles.container}>
      <Link to={`/competitions/${id}`} className={styles.backLink}>
        ← ダッシュボードに戻る
      </Link>

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.title}>
            {competition.name} レポート
            {isInProgress && <span className={styles.statusBadge}>途中結果</span>}
          </span>
          <span className={styles.subtitle}>
            {participants.length}名参加 / {tables.length}卓 / {gameResults.length}対局
          </span>
        </div>
        <div className={styles.actions}>
          <Button onClick={handleCsvExport} disabled={gameResults.length === 0}>
            CSV
          </Button>
          <Button onClick={handlePdfExport} disabled={gameResults.length === 0}>
            PDF（印刷）
          </Button>
        </div>
      </div>

      {/* Overall Standings */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>総合成績</h2>
        {standings.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>順位</th>
                  <th>参加者名</th>
                  <th className={styles.numericHeader}>対局数</th>
                  <th className={styles.numericHeader}>合計ポイント</th>
                  <th className={styles.numericHeader}>平均順位</th>
                  {useChip && <th className={styles.numericHeader}>チップ収支</th>}
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.participantId}>
                    <td className={styles.rankCell}>{s.rank}</td>
                    <td className={styles.nameCell}>
                      <span className={styles.nameText}>{s.name}</span>
                    </td>
                    <td className={styles.numericCell}>{s.gameCount}</td>
                    <td className={`${styles.numericCell} ${pointClass(s.totalPoint)}`}>
                      {formatPoint(s.totalPoint)}
                    </td>
                    <td className={styles.numericCell}>{formatAverageRank(s.averageRank)}</td>
                    {useChip && (
                      <td className={`${styles.numericCell} ${pointClass(s.totalChip)}`}>
                        {s.totalChip > 0 ? '+' : ''}
                        {s.totalChip}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.center}>対局結果がまだありません</div>
        )}
      </div>

      {/* Match Details */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>対局別詳細</h2>
        {matchDetails.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>卓名</th>
                  <th className={styles.numericHeader}>対局番号</th>
                  <th>参加者名</th>
                  <th>順位</th>
                  <th className={styles.numericHeader}>素点</th>
                  <th className={styles.numericHeader}>ポイント</th>
                  {useChip && <th className={styles.numericHeader}>チップ収支</th>}
                </tr>
              </thead>
              <tbody>
                {matchDetails.map((d, i) => (
                  <tr
                    key={`${d.participantId}-${d.tableName}-${d.gameIndex}-${i}`}
                    className={d.gameIndex % 2 === 0 ? styles.zebraEven : undefined}
                  >
                    <td>{d.tableName}</td>
                    <td className={styles.numericCell}>{d.gameIndex}</td>
                    <td className={styles.nameCell}>
                      <span className={styles.nameText}>{d.name}</span>
                    </td>
                    <td className={styles.rankCell}>{d.rank}</td>
                    <td className={styles.numericCell}>{d.rawScore.toLocaleString()}</td>
                    <td className={`${styles.numericCell} ${pointClass(d.point)}`}>
                      {formatPoint(d.point)}
                    </td>
                    {useChip && (
                      <td className={`${styles.numericCell} ${pointClass(d.chipDiff)}`}>
                        {d.chipDiff > 0 ? '+' : ''}
                        {d.chipDiff}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.center}>対局結果がまだありません</div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>詳細分析対象イベント</h2>
        <AnalysisEventList
          events={analysisEvents}
          savedHandLogIds={savedHandLogIds}
          emptyMessage="この大会で分析対象のイベントはまだありません。"
          onSelect={(event) => {
            setAnalysisSelection({
              handLog: event.handLog,
              source: event.source,
              players: event.players,
            });
          }}
        />
      </div>

      {/* Table Summary */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>卓別サマリ</h2>
        {tableSummary.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>卓名</th>
                  <th>モード</th>
                  <th className={styles.numericHeader}>対局回数</th>
                  <th>参加者</th>
                </tr>
              </thead>
              <tbody>
                {tableSummary.map((t) => (
                  <tr key={t.tableId}>
                    <td>{t.tableName}</td>
                    <td>{t.mode === '3ma' ? '3麻' : '4麻'}</td>
                    <td className={styles.numericCell}>{t.gameCount}</td>
                    <td style={{ textAlign: 'left' }}>
                      <div className={styles.tagList}>
                        {t.participantNames.map((name) => (
                          <span key={name} className={styles.tag}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.center}>卓がまだ作成されていません</div>
        )}
      </div>

      <AnalysisEventModalLauncher
        isOpen={analysisSelection !== null}
        selection={analysisSelection}
        onClose={() => setAnalysisSelection(null)}
      />
    </div>
  );
};
