import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MatchFinishedModal } from '../components/features/MatchFinishedModal';
import { ResultView } from '../components/features/ResultView';
import { ScoreBoard } from '../components/features/ScoreBoard';
import { ScoringModal } from '../components/features/ScoringModal';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useCompetitionMatch } from '../hooks/useCompetitionMatch';
import { useMatchGame } from '../hooks/useMatchGame';
import { auth } from '../services/firebase';
import styles from './CompetitionTablePage.module.css';

const WIND_LABELS: Record<string, string> = {
  East: '東',
  South: '南',
  West: '西',
  North: '北',
};

export const CompetitionTablePage = () => {
  const { id: competitionId, tableId } = useParams<{ id: string; tableId: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const {
    competition,
    table,
    participants,
    room,
    canManage,
    updateState,
    startMatch,
    saveResult,
    startNextMatch,
    dissolveTable,
    matchPhase,
    loading,
    gameSettings,
  } = useCompetitionMatch(competitionId || '', tableId || '');

  const matchGame = useMatchGame({ room, updateState });

  const myPlayerId = auth.currentUser?.uid || '';

  // Scoring modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [initialWinType, setInitialWinType] = useState<'Ron' | 'Tsumo' | 'Ryukyoku'>('Ron');

  // Dissolve confirmation
  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);

  // Auto-save result when game finishes
  const savedResultRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      room?.status === 'finished' &&
      matchGame.gameResult &&
      savedResultRef.current !== matchGame.gameResult.id
    ) {
      savedResultRef.current = matchGame.gameResult.id;
      saveResult(matchGame.gameResult).catch(() => {
        showSnackbar('結果の保存に失敗しました');
      });
    }
  }, [room?.status, matchGame.gameResult, saveResult, showSnackbar]);

  const handlePlayerClick = useCallback(
    (id: string) => {
      if (!room) return;
      setSelectedWinnerId(id);
      setInitialWinType('Ron');
      setIsModalOpen(true);
    },
    [room],
  );

  const handleCenterClick = useCallback(() => {
    if (!room) return;
    setInitialWinType('Ryukyoku');
    setIsModalOpen(true);
  }, [room]);

  const handleStartMatch = useCallback(async () => {
    try {
      await startMatch();
    } catch {
      showSnackbar('対局の開始に失敗しました');
    }
  }, [startMatch, showSnackbar]);

  const handleNextMatch = useCallback(async () => {
    try {
      await startNextMatch();
    } catch {
      showSnackbar('次の対局の開始に失敗しました');
    }
  }, [startNextMatch, showSnackbar]);

  const handleDissolveTable = useCallback(async () => {
    try {
      await dissolveTable();
      navigate(`/competitions/${competitionId}`);
    } catch {
      showSnackbar('卓の解散に失敗しました');
    }
  }, [dissolveTable, navigate, competitionId, showSnackbar]);

  if (loading || matchPhase === 'loading') {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!competition || !table) {
    return (
      <div className={styles.container}>
        <p>卓が見つかりません</p>
        <Link to={`/competitions/${competitionId}`} className={styles.backLink}>
          ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  // Lobby phase
  if (matchPhase === 'lobby') {
    const seatAssignment = table.seatAssignment ?? {};
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.headerSub}>{competition.name}</p>
          <h1 className={styles.headerTitle}>{table.name}</h1>
        </div>

        <div className={styles.seatList}>
          {table.playerIds.map((pid) => {
            const p = participants.find((pp) => pp.id === pid);
            const wind = seatAssignment[pid];
            return (
              <div key={pid} className={styles.seatRow}>
                <span className={styles.windBadge}>{wind ? WIND_LABELS[wind] || wind : '-'}</span>
                <span className={styles.playerName}>{p?.name ?? '(不明)'}</span>
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <Button onClick={handleStartMatch} disabled={table.status !== 'ready' || !canManage}>
            対局開始
          </Button>
        </div>

        <Link to={`/competitions/${competitionId}`} className={styles.backLink}>
          ← ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  // Playing phase
  if (matchPhase === 'playing' && room) {
    const currentDealer = room.players.find((p) => p.wind === 'East');
    const hasHandledFinish = !matchGame.isTransitioning && room.status === 'finished';

    // If finished but not transitioning anymore, show result view
    if (hasHandledFinish) {
      return renderFinishedView();
    }

    return (
      <div className={styles.container}>
        <div className={styles.contextHeader}>
          <div className={styles.header}>
            <p className={styles.headerSub}>
              {competition.name} / {table.name}
            </p>
            <p className={styles.headerSub}>第{(table.gameCount || 0) + 1}局目</p>
          </div>
        </div>

        <ScoreBoard
          players={room.players}
          round={room.round}
          lastEvent={room.lastEvent}
          currentUserId={myPlayerId}
          onPlayerClick={handlePlayerClick}
          onRiichi={matchGame.handleRiichi}
          onCenterClick={handleCenterClick}
          useChip={room.settings.useChip}
        />

        {room.history && room.history.length > 0 && (
          <div className={styles.undoRow}>
            <Button onClick={matchGame.handleUndo} variant="secondary">
              Undo ({room.history.length})
            </Button>
          </div>
        )}

        <ScoringModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          players={room.players}
          dealerId={currentDealer?.id || room.players[0]?.id || ''}
          currentUserId={myPlayerId}
          initialWinnerId={selectedWinnerId || room.players[0]?.id}
          initialWinType={initialWinType}
          settings={room.settings}
          onConfirm={async (results) => {
            await matchGame.handleScoreConfirm(results);
            setIsModalOpen(false);
          }}
          onRyukyoku={async (tenpaiIds) => {
            await matchGame.handleRyukyoku(tenpaiIds);
            setIsModalOpen(false);
          }}
        />

        <MatchFinishedModal
          isOpen={matchGame.showFinishedModal}
          onConfirm={matchGame.dismissFinishedModal}
        />

        {matchGame.extensionOverlay && (
          <div className={styles.extensionOverlay}>
            <span className={styles.extensionText}>{matchGame.extensionOverlay}</span>
          </div>
        )}
      </div>
    );
  }

  // Finished phase
  if (matchPhase === 'finished' && room) {
    return renderFinishedView();
  }

  return <div className={styles.container}>Loading...</div>;

  function renderFinishedView() {
    if (!room || !gameSettings) return null;

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.headerSub}>
            {competition!.name} / {table!.name}
          </p>
        </div>

        <ResultView
          room={room}
          onNextGame={handleNextMatch}
          onEndMatch={() => setIsDissolveConfirmOpen(true)}
        />

        <div className={styles.finishedActions}>
          {canManage && (
            <>
              <Button onClick={handleNextMatch}>次の対局を開始</Button>
              <Button variant="danger" onClick={() => setIsDissolveConfirmOpen(true)}>
                卓を終了
              </Button>
            </>
          )}
          <Link to={`/competitions/${competitionId}`} className={styles.backLink}>
            ← ダッシュボードに戻る
          </Link>
        </div>

        <ConfirmationDialog
          isOpen={isDissolveConfirmOpen}
          onConfirm={handleDissolveTable}
          onCancel={() => setIsDissolveConfirmOpen(false)}
          title="卓の終了確認"
          message="この卓を終了しますか？\n参加者は待機状態に戻ります。"
          type="danger"
          confirmText="終了する"
        />
      </div>
    );
  }
};
