import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useCompetitionSeries } from '../hooks/useCompetitionSeries';
import { aggregateCompetitionSeriesStandings } from '../utils/competitionSeries';
import { generatePdfReport } from '../utils/exportReport';
import { formatAverageRank, formatPoint } from '../utils/formatUtils';
import styles from './CompetitionSeriesReportPage.module.css';

const formatDate = (date?: string): string => {
  if (!date) return '未設定';
  return new Date(`${date}T00:00:00`).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatDateTime = (date: Date): string =>
  date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const pointClass = (point: number): string => {
  if (point > 0) return styles.positive;
  if (point < 0) return styles.negative;
  return styles.zero;
};

export const CompetitionSeriesReportPage = () => {
  const { seriesId = '' } = useParams<{ seriesId: string }>();
  const { series, members, rounds, loading, roundDetailsLoading } = useCompetitionSeries(seriesId);
  const generatedAt = useMemo(() => new Date(), []);
  const roundData = useMemo(
    () =>
      rounds.flatMap((item) =>
        item.competition
          ? [
              {
                competitionId: item.competition.id,
                competitionName: item.competition.name,
                roundNumber: item.round.roundNumber,
                participants: item.participants,
                gameResults: item.gameResults,
              },
            ]
          : [],
      ),
    [rounds],
  );
  const aggregation = useMemo(
    () => aggregateCompetitionSeriesStandings(members, roundData),
    [members, roundData],
  );
  const breakdownRows = useMemo(
    () =>
      aggregation.standings.flatMap((standing) =>
        standing.rounds.map((round) => ({
          seriesMemberId: standing.seriesMemberId,
          name: standing.name,
          ...round,
        })),
      ),
    [aggregation.standings],
  );
  const gameCount = rounds.reduce((total, item) => total + item.gameResults.length, 0);
  const useChip = rounds.some((item) => item.competition?.settings.useChip);
  const isInProgress = rounds.some(
    (item) =>
      item.competition?.status === 'recruiting' || item.competition?.status === 'in_progress',
  );
  const unavailableRounds = rounds.filter((item) => item.competition === null);
  const hasIncompleteData =
    aggregation.unlinkedParticipants.length > 0 || unavailableRounds.length > 0;
  const canPrint = gameCount > 0 && !hasIncompleteData;

  if (!seriesId || (!loading && !series)) {
    return <div className={styles.center}>大会シリーズが見つかりません</div>;
  }

  if (loading || roundDetailsLoading) {
    return <div className={styles.center}>読み込み中...</div>;
  }

  if (!series) {
    return <div className={styles.center}>大会シリーズが見つかりません</div>;
  }

  return (
    <main className={styles.container}>
      <Link to={`/competition-series/${seriesId}`} className={styles.backLink}>
        ← シリーズダッシュボードに戻る
      </Link>

      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            {series.name} シリーズレポート
            {isInProgress && <span className={styles.statusBadge}>途中結果</span>}
          </h1>
          <p className={styles.period}>
            {formatDate(series.startDate)} 〜 {formatDate(series.endDate)}
          </p>
          <p className={styles.subtitle}>
            {members.length}名参加 / {rounds.length}開催回 / {gameCount}対局
          </p>
          <p className={styles.generatedAt}>集計日時: {formatDateTime(generatedAt)}</p>
        </div>
        <div className={styles.actions}>
          <Button
            onClick={generatePdfReport}
            disabled={!canPrint}
            title={!canPrint ? 'すべての成績を確認してから出力してください' : undefined}
          >
            PDF（印刷）
          </Button>
        </div>
      </header>

      {hasIncompleteData && (
        <div className={styles.warning} role="alert">
          <p>未確認のデータがあるため、PDFを出力できません。</p>
          {aggregation.unlinkedParticipants.length > 0 && (
            <>
              <p>次の成績参加者をシリーズ参加者へ名寄せしてください。</p>
              <ul>
                {aggregation.unlinkedParticipants.map((participant) => (
                  <li key={`${participant.competitionId}:${participant.participantId}`}>
                    第{participant.roundNumber}回 {participant.competitionName}: {participant.name}
                  </li>
                ))}
              </ul>
            </>
          )}
          {unavailableRounds.length > 0 && (
            <ul>
              {unavailableRounds.map(({ round }) => (
                <li key={round.id}>第{round.roundNumber}回の大会データを取得できません</li>
              ))}
            </ul>
          )}
          <Link to={`/competition-series/${seriesId}`} className={styles.warningLink}>
            シリーズダッシュボードで名寄せ・開催回を確認する
          </Link>
        </div>
      )}

      <section className={styles.section} aria-labelledby="series-overall-heading">
        <h2 id="series-overall-heading" className={styles.sectionTitle}>
          シリーズ総合成績
        </h2>
        {gameCount === 0 ? (
          <div className={styles.empty}>対局結果がまだありません</div>
        ) : aggregation.standings.length === 0 ? (
          <div className={styles.empty}>名寄せ済みの対局結果がありません</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>順位</th>
                  <th>参加者名</th>
                  <th className={styles.numericHeader}>参加回数</th>
                  <th className={styles.numericHeader}>対局数</th>
                  <th className={styles.numericHeader}>合計ポイント</th>
                  <th className={styles.numericHeader}>平均順位</th>
                  {useChip && <th className={styles.numericHeader}>チップ収支</th>}
                </tr>
              </thead>
              <tbody>
                {aggregation.standings.map((standing) => (
                  <tr key={standing.seriesMemberId}>
                    <td className={styles.rankCell}>{standing.rank}</td>
                    <td className={styles.nameCell}>{standing.name}</td>
                    <td className={styles.numericCell}>{standing.appearanceCount}</td>
                    <td className={styles.numericCell}>{standing.gameCount}</td>
                    <td className={`${styles.numericCell} ${pointClass(standing.totalPoint)}`}>
                      {formatPoint(standing.totalPoint)}
                    </td>
                    <td className={styles.numericCell}>
                      {formatAverageRank(standing.averageRank)}
                    </td>
                    {useChip && (
                      <td className={`${styles.numericCell} ${pointClass(standing.totalChip)}`}>
                        {formatPoint(standing.totalChip)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="series-breakdown-heading">
        <h2 id="series-breakdown-heading" className={styles.sectionTitle}>
          開催回別内訳
        </h2>
        {breakdownRows.length === 0 ? (
          <div className={styles.empty}>表示できる開催回別成績がありません</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>参加者名</th>
                  <th>開催回</th>
                  <th>大会名</th>
                  <th className={styles.numericHeader}>対局数</th>
                  <th className={styles.numericHeader}>合計ポイント</th>
                  <th className={styles.numericHeader}>平均順位</th>
                  {useChip && <th className={styles.numericHeader}>チップ収支</th>}
                </tr>
              </thead>
              <tbody>
                {breakdownRows.map((row) => (
                  <tr key={`${row.seriesMemberId}:${row.competitionId}`}>
                    <td className={styles.nameCell}>{row.name}</td>
                    <td>第{row.roundNumber}回</td>
                    <td>{row.competitionName}</td>
                    <td className={styles.numericCell}>{row.gameCount}</td>
                    <td className={`${styles.numericCell} ${pointClass(row.totalPoint)}`}>
                      {formatPoint(row.totalPoint)}
                    </td>
                    <td className={styles.numericCell}>{formatAverageRank(row.averageRank)}</td>
                    {useChip && (
                      <td className={`${styles.numericCell} ${pointClass(row.totalChip)}`}>
                        {formatPoint(row.totalChip)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
