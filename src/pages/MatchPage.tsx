import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AdjustmentModal } from '../components/features/AdjustmentModal';
import { AnalysisEventList } from '../components/features/AnalysisEventList';
import {
  AnalysisEventModalLauncher,
  type AnalysisModalSelection,
} from '../components/features/AnalysisEventModalLauncher';
import { LobbyView } from '../components/features/LobbyView';
import { MatchFinishedModal } from '../components/features/MatchFinishedModal';
import { ResultView } from '../components/features/ResultView';
import { ScoreBoard } from '../components/features/ScoreBoard';
import { ScoringModal } from '../components/features/ScoringModal';
import { SessionHistoryTable } from '../components/features/SessionHistoryTable';
import { SettlementModal } from '../components/features/SettlementModal';
import { SoundEffectToggle } from '../components/features/SoundEffectToggle';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAnalysisEntries } from '../hooks/useAnalysisEntries';
import { useMatchGame } from '../hooks/useMatchGame';
import { useRoom } from '../hooks/useRoom';
import { useRoomSoundEffects } from '../hooks/useRoomSoundEffects';
import { auth } from '../services/firebase';
import type { HandLog, Player, ScorePayment } from '../types';
import type { AdjustmentParams } from '../utils/adjustment';
import { getAnalysisEventType } from '../utils/analysis';
import { buildRoomAnalysisEvents } from '../utils/analysisEvents';
import { isReadOnlyFinishedCompetitionRoom } from '../utils/historyRoomStatus';
import { getWinnerIdSetFromLogs } from '../utils/resultCalculator';

export const MatchPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { room, loading, join, updateState } = useRoom(roomId || '');

  // Local user ID (Auth)
  const [myPlayerId] = useState<string>(() => {
    return auth.currentUser?.uid || '';
  });
  const [joinName, setJoinName] = useState(() => localStorage.getItem('mahjong_player_name') || '');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [isEndMatchConfirmOpen, setIsEndMatchConfirmOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isAbortConfirmOpen, setIsAbortConfirmOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [analysisSelection, setAnalysisSelection] = useState<AnalysisModalSelection | null>(null);
  const { isSoundEnabled, setIsSoundEnabled } = useRoomSoundEffects(room?.lastEvent);
  const { entries: analysisEntries } = useAnalysisEntries();

  const savedHandLogIds = useMemo(() => {
    return new Set(analysisEntries.map((entry) => entry.source.handLogId));
  }, [analysisEntries]);

  const analysisEvents = useMemo(() => {
    if (!room) {
      return [];
    }

    return buildRoomAnalysisEvents(room, myPlayerId);
  }, [myPlayerId, room]);

  const yakitoriPlayerIds = useMemo(() => {
    if (!room?.settings.yakitoriEnabled) {
      return undefined;
    }
    const winnerIds = getWinnerIdSetFromLogs(room.currentLogs ?? []);
    const yakitoriIds = new Set<string>();
    for (const player of room.players) {
      if (!winnerIds.has(player.id)) {
        yakitoriIds.add(player.id);
      }
    }
    return yakitoriIds;
  }, [room]);

  const promptAnalysisForHand = (handLog: HandLog, playersSnapshot: Player[]) => {
    if (!room || !getAnalysisEventType(handLog, myPlayerId)) {
      return;
    }

    const selection: AnalysisModalSelection = {
      handLog,
      source: {
        kind: 'room',
        roomId: room.id,
        handLogId: handLog.id,
      },
      players: playersSnapshot,
    };

    showSnackbar('この局の分析メモを残せます。', {
      actionLabel: '開く',
      autoHideDuration: 5000,
      onAction: () => setAnalysisSelection(selection),
    });
  };

  // Game logic hook
  const {
    handleScoreConfirm: hookScoreConfirm,
    handleRyukyoku: hookRyukyoku,
    handleUndo,
    handleRiichi,
    handleAdjustment: hookAdjustment,
    handleStartGame,
    handleReorder: handleLobbyReorder,
    handleAbortGame: hookAbortGame,
    isTransitioning,
    showFinishedModal,
    hasHandledFinish,
    extensionOverlay,
    dismissFinishedModal,
  } = useMatchGame({ room, updateState });

  const handleScoreConfirm = async (
    results: {
      payment: ScorePayment;
      winnerId: string;
      loserId: string | null;
      chips: number;
    }[],
  ) => {
    const newLog = await hookScoreConfirm(results);
    if (newLog && room) {
      promptAnalysisForHand(newLog, room.players);
    }
    setIsModalOpen(false);
  };

  const handleRyukyoku = async (tenpaiIds: string[]) => {
    const newLog = await hookRyukyoku(tenpaiIds);
    if (newLog && room) {
      promptAnalysisForHand(newLog, room.players);
    }
    setIsModalOpen(false);
  };

  const handleAdjustment = async (params: AdjustmentParams) => {
    await hookAdjustment(params);
    setIsAdjustmentOpen(false);
  };

  const handleAbortGame = async (saveResult: boolean) => {
    setIsAbortConfirmOpen(false);
    await hookAbortGame({ saveResult });
  };

  // Check if I need to join
  useEffect(() => {
    if (room && !loading) {
      const isJoined = room.players.some((p) => p.id === myPlayerId);
      if (!isJoined && room.players.length < (room.settings.mode === '4ma' ? 4 : 3)) {
        setTimeout(() => setIsJoinModalOpen(true), 0);
      }
    }
  }, [room, loading, myPlayerId]);

  const handleJoinSubmit = async () => {
    if (!joinName.trim()) return;
    localStorage.setItem('mahjong_player_name', joinName);

    // Determine info
    const winds: ('East' | 'South' | 'West' | 'North')[] = ['East', 'South', 'West', 'North'];
    // Assign next available wind
    // Simple logic: room.players.length -> index
    const assignedWind = winds[room?.players.length || 0];

    try {
      await join({
        id: myPlayerId,
        name: joinName,
        score: room?.settings.startPoint ?? 25000,
        wind: assignedWind,
        isRiichi: false,
        chip: 0,
      });
      setIsJoinModalOpen(false);
    } catch {
      showSnackbar('Join failed');
    }
  };

  const [selectedLoserId, setSelectedLoserId] = useState<string | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialWinType, setInitialWinType] = useState<'Ron' | 'Tsumo' | 'Ryukyoku'>('Ron');

  const handlePlayerClick = (id: string) => {
    if (!room) return;

    // Always treat the clicked player as the Winner
    setSelectedWinnerId(id);
    setSelectedLoserId(null);
    setInitialWinType('Ron');
    setIsModalOpen(true);
  };

  const handleCenterClick = () => {
    if (!room) return;
    setInitialWinType('Ryukyoku');
    setIsModalOpen(true);
  };

  const handleNextGame = async () => {
    if (!room) return;

    const newPlayers = room.players.map((p) => {
      return {
        ...p,
        score: room.settings.startPoint,
        isRiichi: false,
      };
    });

    await updateState({
      players: newPlayers,
      round: {
        wind: 'East',
        number: 1,
        honba: 0,
        riichiSticks: 0,
      },
      status: 'waiting',
      history: [],
      currentLogs: [],
    });
  };

  if (loading) return <div>Loading Room...</div>;
  if (!room)
    return (
      <div>
        Room not found or error. <Button onClick={() => navigate('/')}>Top</Button>
      </div>
    );

  if (isReadOnlyFinishedCompetitionRoom(room)) {
    return <Navigate replace to={`/history/${room.id}`} />;
  }

  // Render Lobby
  if (room.status === 'waiting') {
    return (
      <>
        <LobbyView
          room={room}
          currentUserId={myPlayerId}
          onReorder={handleLobbyReorder}
          onStartGame={handleStartGame}
        />
        {/* Join Modal */}
        <Modal isOpen={isJoinModalOpen} onClose={() => {}} title="Join Room">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label>Your Name</label>
            <Input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              style={{ fontSize: '16px' }}
            />
            <Button onClick={handleJoinSubmit} disabled={!joinName}>
              Join Game
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  const handleEndMatch = async () => {
    setIsEndMatchConfirmOpen(true);
  };

  const handleEndMatchConfirm = () => {
    setIsEndMatchConfirmOpen(false);
    setIsSettlementOpen(true);
  };

  const handleSettlementClose = async () => {
    if (!room) return;
    await updateState({
      status: 'ended',
    });
    setIsSettlementOpen(false);
    navigate('/');
  };

  if (
    (room.status === 'finished' && !isTransitioning && hasHandledFinish) ||
    room.status === 'ended'
  ) {
    return (
      <>
        <ResultView room={room} onNextGame={handleNextGame} onEndMatch={handleEndMatch} />
        <ConfirmationDialog
          isOpen={isEndMatchConfirmOpen}
          onConfirm={handleEndMatchConfirm}
          onCancel={() => setIsEndMatchConfirmOpen(false)}
          title="対局終了の確認"
          message={'この対局を終了しますか？\n終了後は閲覧のみ可能になります。'}
          type="danger"
          confirmText="終了する"
        />
        <SettlementModal
          isOpen={isSettlementOpen}
          onClose={handleSettlementClose}
          players={room.players}
          gameResults={room.gameResults || []}
          rate={room.settings.rate || 0}
        />
      </>
    );
  }

  const currentDealer = room.players.find((p) => p.wind === 'East');

  return (
    <div
      style={{
        padding: '16px',
        maxWidth: '600px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Room: {room.id}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              showSnackbar('Copied URL', {
                position: 'top',
                autoHideDuration: 2000,
              });
            }}
          >
            Share
          </Button>
          <Button size="small" variant="secondary" onClick={() => setIsMenuOpen(true)}>
            Menu
          </Button>
        </div>
      </div>

      <ScoreBoard
        players={room.players}
        round={room.round}
        lastEvent={room.lastEvent}
        currentUserId={myPlayerId}
        onPlayerClick={handlePlayerClick}
        onRiichi={handleRiichi}
        onCenterClick={handleCenterClick}
        useChip={room.settings.useChip}
        yakitoriPlayerIds={yakitoriPlayerIds}
      />

      {/* Undo Button */}
      {room.history && room.history.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleUndo}
            variant="secondary"
            style={{ padding: '8px 16px', fontSize: '16px' }}
          >
            Undo ({room.history.length})
          </Button>
        </div>
      )}

      {/* Scoring Modal */}
      <ScoringModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        players={room.players}
        dealerId={currentDealer?.id || room.players[0]?.id || ''}
        currentUserId={myPlayerId}
        initialWinnerId={selectedWinnerId || room.players[0]?.id}
        initialLoserId={selectedLoserId || undefined}
        initialWinType={initialWinType}
        settings={room.settings}
        onConfirm={handleScoreConfirm}
        onRyukyoku={handleRyukyoku}
      />

      {/* Join Modal */}
      <Modal isOpen={isJoinModalOpen} onClose={() => {}} title="Join Room">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>Your Name</label>
          <Input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            style={{ fontSize: '16px' }}
          />
          <Button onClick={handleJoinSubmit} disabled={!joinName}>
            Join Game
          </Button>
        </div>
      </Modal>

      {/* Menu Modal */}
      <Modal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="メニュー">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SoundEffectToggle checked={isSoundEnabled} onChange={setIsSoundEnabled} />
          <Button
            onClick={() => {
              setIsMenuOpen(false);
              setIsHistoryOpen(true);
            }}
            size="large"
          >
            戦績 (History)
          </Button>
          {room.status === 'playing' && (
            <Button
              onClick={() => {
                setIsMenuOpen(false);
                setIsAdjustmentOpen(true);
              }}
              size="large"
            >
              点数調整
            </Button>
          )}
          {room.status === 'playing' && (
            <Button
              variant="danger"
              onClick={() => {
                setIsMenuOpen(false);
                setIsAbortConfirmOpen(true);
              }}
            >
              途中終了
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/')}>
            トップへ戻る
          </Button>
          <Button variant="secondary" onClick={() => setIsMenuOpen(false)}>
            閉じる
          </Button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="戦績履歴">
        <SessionHistoryTable room={room} />
        <div style={{ marginTop: '24px', display: 'grid', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>詳細分析対象イベント</h3>
          <AnalysisEventList
            events={analysisEvents}
            savedHandLogIds={savedHandLogIds}
            emptyMessage="分析対象のイベントはまだありません。"
            onSelect={(event) => {
              setAnalysisSelection({
                handLog: event.handLog,
                source: event.source,
                players: event.players,
              });
            }}
          />
        </div>
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button onClick={() => setIsHistoryOpen(false)}>閉じる</Button>
        </div>
      </Modal>

      {/* Match Finished Modal */}
      <MatchFinishedModal isOpen={showFinishedModal} onConfirm={dismissFinishedModal} />

      <ConfirmationDialog
        isOpen={isEndMatchConfirmOpen}
        onConfirm={handleEndMatchConfirm}
        onCancel={() => setIsEndMatchConfirmOpen(false)}
        title="対局終了の確認"
        message={'この対局を終了しますか？\n終了後は閲覧のみ可能になります。'}
        type="danger"
        confirmText="終了する"
      />

      <SettlementModal
        isOpen={isSettlementOpen}
        onClose={handleSettlementClose}
        players={room.players}
        gameResults={room.gameResults || []}
        rate={room.settings.rate || 0}
      />

      <AnalysisEventModalLauncher
        isOpen={analysisSelection !== null}
        selection={analysisSelection}
        onClose={() => setAnalysisSelection(null)}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        players={room.players}
        onConfirm={handleAdjustment}
      />

      {/* Abort Game Modal */}
      <Modal
        isOpen={isAbortConfirmOpen}
        onClose={() => setIsAbortConfirmOpen(false)}
        title="途中終了の確認"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>対局を途中終了しますか？</p>
          <p
            style={{
              margin: 0,
              lineHeight: 1.5,
              fontSize: '14px',
              color: 'var(--color-text-secondary, #666)',
            }}
          >
            供託は1位総取りとなります。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button variant="primary" onClick={() => handleAbortGame(true)}>
              成績に反映して終了
            </Button>
            <Button variant="danger" onClick={() => handleAbortGame(false)}>
              成績に反映せず終了
            </Button>
            <Button variant="secondary" onClick={() => setIsAbortConfirmOpen(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      </Modal>

      {/* Extension Overlay */}
      {extensionOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.5s ease-out',
          }}
        >
          <h1
            style={{
              color: '#fff',
              fontSize: '3rem',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              textAlign: 'center',
            }}
          >
            {extensionOverlay}
          </h1>
        </div>
      )}
    </div>
  );
};
