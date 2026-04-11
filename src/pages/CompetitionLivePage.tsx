import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LiveTableTile } from '../components/features/LiveTableTile';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useCompetition } from '../hooks/useCompetition';
import { useLiveRooms } from '../hooks/useLiveRooms';
import { subscribeToCompetition, verifyPasscode } from '../services/competitionService';
import type { Competition } from '../types';
import { aggregateOverallStandings } from '../utils/competitionReport';
import { formatAverageRank, formatPoint } from '../utils/formatUtils';
import styles from './CompetitionLivePage.module.css';

const AUTO_SCROLL_SPEED = 1;
const AUTO_SCROLL_INTERVAL = 50;

export const CompetitionLivePage = () => {
  const { id } = useParams<{ id: string }>();
  const { showSnackbar } = useSnackbar();

  // Passcode gate state
  const [gateLoading, setGateLoading] = useState(true);
  const [gateComp, setGateComp] = useState<Competition | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Load competition for passcode check
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToCompetition(id, (data) => {
      setGateComp(data);
      setGateLoading(false);
      if (data && !data.hasPasscode) {
        setAuthenticated(true);
      }
    });
    return () => unsub();
  }, [id]);

  const handlePasscodeSubmit = useCallback(async () => {
    if (!id) return;
    setVerifying(true);
    try {
      const valid = await verifyPasscode(id, passcodeInput);
      if (valid) {
        setAuthenticated(true);
      } else {
        showSnackbar('パスコードが正しくありません', { position: 'top' });
      }
    } finally {
      setVerifying(false);
    }
  }, [id, passcodeInput, showSnackbar]);

  if (!id) {
    return <div className={styles.center}>大会が見つかりません</div>;
  }

  if (gateLoading) {
    return <div className={styles.center}>読み込み中...</div>;
  }

  if (!gateComp) {
    return <div className={styles.center}>大会が見つかりません</div>;
  }

  if (!authenticated) {
    return (
      <div className={styles.gate}>
        <span className={styles.gateName}>{gateComp.name}</span>
        <div className={styles.gateForm}>
          <Input
            type="password"
            placeholder="パスコード"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasscodeSubmit();
            }}
          />
          <Button onClick={handlePasscodeSubmit} disabled={verifying}>
            {verifying ? '確認中...' : 'ライブビューを表示'}
          </Button>
        </div>
      </div>
    );
  }

  return <LiveViewContent competitionId={id} />;
};

const pointClass = (pt: number): string => {
  if (pt > 0) return styles.positive;
  if (pt < 0) return styles.negative;
  return styles.zero;
};

const LiveViewContent = ({ competitionId }: { competitionId: string }) => {
  const { competition, participants, tables, gameResults, loading } = useCompetition(competitionId);
  const { rooms } = useLiveRooms(tables);
  const [autoScroll, setAutoScroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const standings = useMemo(
    () => aggregateOverallStandings(gameResults, participants),
    [gameResults, participants],
  );

  const useChip = competition?.settings.useChip ?? false;

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    let direction = 1;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop += AUTO_SCROLL_SPEED * direction;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        direction = -1;
      } else if (el.scrollTop <= 0) {
        direction = 1;
      }
    }, AUTO_SCROLL_INTERVAL);
    return () => clearInterval(interval);
  }, [autoScroll]);

  if (loading) {
    return <div className={styles.center}>読み込み中...</div>;
  }

  if (!competition) {
    return <div className={styles.center}>大会が見つかりません</div>;
  }

  const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <span className={styles.title}>{competition.name}</span>
          <span className={styles.summary}>
            {tables.length}卓 / {participants.length}名
          </span>
        </div>
        <div className={styles.controls}>
          <Link to={`/competitions/${competitionId}`} className={styles.dashboardLink}>
            大会ダッシュボード
          </Link>
          <button
            type="button"
            className={autoScroll ? styles.autoScrollActive : styles.autoScrollBtn}
            onClick={() => setAutoScroll((v) => !v)}
          >
            {autoScroll ? '自動スクロール ON' : '自動スクロール OFF'}
          </button>
        </div>
      </div>
      <div ref={scrollRef} className={styles.scrollArea}>
        <div className={styles.grid}>
          {sortedTables.map((table) => (
            <LiveTableTile
              key={table.id}
              table={table}
              room={table.currentRoomId ? (rooms.get(table.currentRoomId) ?? null) : null}
              participants={participants}
            />
          ))}
          {sortedTables.length === 0 && (
            <div className={styles.center}>卓がまだ作成されていません</div>
          )}
        </div>
        <div className={styles.standingsSection}>
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
                      <td className={styles.nameCell}>{s.name}</td>
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
            <div className={styles.emptyStandings}>対局結果がまだありません</div>
          )}
        </div>
      </div>
    </div>
  );
};
