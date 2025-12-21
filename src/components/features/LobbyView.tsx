import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import QRCode from 'react-qr-code';
import type { Player, RoomState } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface LobbyViewProps {
  room: RoomState;
  currentUserId: string;
  onReorder: (newPlayers: Player[]) => void;
  onStartGame: () => void;
}

// Re-defining for correct prop usage
interface SortablePlayerItemPropsFixed {
  player: Player;
  currentUserId: string;
  isViewerHost: boolean;
  isPlayerHost: boolean;
  windLabel: string;
}

const SortablePlayerItemFixed = ({
  player,
  currentUserId,
  isViewerHost,
  isPlayerHost,
  windLabel,
}: SortablePlayerItemPropsFixed) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
    disabled: !isViewerHost,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.8 : 1,
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    background: player.id === currentUserId ? 'rgba(76, 175, 80, 0.2)' : 'var(--color-bg-main)',
    border: `1px solid ${player.id === currentUserId ? 'var(--color-primary)' : '#444'}`,
    borderRadius: '6px',
    // For listeners to work on mobile without scrolling interference when dragging handle
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag Handle */}
      {isViewerHost && (
        <div
          {...attributes}
          {...listeners}
          title="ドラッグして並べ替え"
          style={{
            cursor: 'grab',
            padding: '4px 8px 4px 0',
            marginRight: '4px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text-secondary)',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
      )}

      <span
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#555',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          fontSize: '0.8rem',
          flexShrink: 0,
        }}
      >
        {windLabel}
      </span>
      <span
        style={{
          fontWeight: 'bold',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {player.name} {player.id === currentUserId && '(自分)'}
      </span>
      {isPlayerHost && (
        <span
          style={{
            fontSize: '0.7rem',
            background: 'var(--color-primary)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            marginLeft: '8px',
          }}
        >
          HOST
        </span>
      )}
    </div>
  );
};

export const LobbyView = ({ room, currentUserId, onReorder, onStartGame }: LobbyViewProps) => {
  const isHost = room.hostId === currentUserId;
  const players = room.players;
  const settings = room.settings;

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before drag starts, preventing accidental drags (though handle solves this mostly)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = players.findIndex((p) => p.id === active.id);
      const newIndex = players.findIndex((p) => p.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(players, oldIndex, newIndex));
      }
    }
  };

  const windLabels: { [key: string]: string } = {
    East: '東',
    South: '南',
    West: '西',
    North: '北',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h2>待機ルーム</h2>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <p>
            ID: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{room.id}</span>
          </p>
          <button
            onClick={() => setIsQRModalOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
            }}
            title="QRコードを表示"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
        </div>
        {!isHost && (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            ホストがゲームを開始するのを待っています...
          </p>
        )}
      </div>

      <Modal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        title="ルームへのリンク"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
          }}
        >
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
            <QRCode value={window.location.href} size={200} />
          </div>
          <p
            style={{
              wordBreak: 'break-all',
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
            }}
          >
            {window.location.href}
          </p>
        </div>
      </Modal>

      <div style={{ background: 'var(--color-bg-card)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>
          参加者 ({players.length}/{settings.mode === '4ma' ? 4 : 3})
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
          {isHost ? 'ドラッグして席順を変更できます (上から東, 南...)' : 'ホストが席順を決定します'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={players.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {players.map((player, index) => (
                <SortablePlayerItemFixed
                  key={player.id}
                  player={player}
                  currentUserId={currentUserId}
                  isViewerHost={isHost}
                  isPlayerHost={player.id === room.hostId}
                  windLabel={Object.values(windLabels)[index] || '?'}
                />
              ))}
            </SortableContext>
          </DndContext>

          {Array.from({ length: (settings.mode === '4ma' ? 4 : 3) - players.length }).map(
            (_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  padding: '12px',
                  border: '1px dashed #555',
                  borderRadius: '6px',
                  color: 'var(--color-text-secondary)',
                  textAlign: 'center',
                }}
              >
                参加者を待っています...
              </div>
            ),
          )}
        </div>
      </div>

      <div style={{ background: 'var(--color-bg-card)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>ルール設定</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '0.9rem',
            color: 'var(--color-text-primary)',
          }}
        >
          <div>モード: {settings.mode === '4ma' ? '4人麻雀' : '3人麻雀'}</div>
          <div>長さ: {settings.length === 'Hanchan' ? '半荘戦' : '東風戦'}</div>
          <div>配給原点: {settings.startPoint.toLocaleString()}</div>
          <div>返し: {settings.returnPoint.toLocaleString()}</div>
          <div>ウマ: {settings.uma.join('-')}</div>
          <div>
            本場: {settings.hasHonba ? `${settings.honbaPoints.toLocaleString()}点` : 'なし'}
          </div>
          <div>テンパイ連荘: {settings.tenpaiRenchan ? 'あり' : 'なし'}</div>
          <div>オカ: {settings.useOka ? 'あり' : 'なし'}</div>
          <div>飛び: {settings.useTobi ? 'あり' : 'なし'}</div>
          <div>チップ: {settings.useChip ? 'あり' : 'なし'}</div>
          <div>符計算: {settings.useFuCalculation ? 'あり' : 'なし (簡易)'}</div>
          <div>
            {settings.mode === '4ma' ? '西' : '北'}入: {settings.westExtension ? 'あり' : 'なし'}
          </div>
          <div>レート: {settings.rate && settings.rate > 0 ? settings.rate : 'なし'}</div>
        </div>
      </div>

      {isHost && (
        <div style={{ marginTop: '16px' }}>
          <Button
            onClick={onStartGame}
            disabled={players.length < (settings.mode === '4ma' ? 3 : 2)}
            style={{ width: '100%', padding: '16px', fontSize: '1.2rem' }}
          >
            ゲーム開始
          </Button>
        </div>
      )}
    </div>
  );
};
