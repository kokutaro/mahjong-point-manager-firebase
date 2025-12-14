import { useRef, useState } from 'react';
import QRCode from "react-qr-code";
import type { Player, RoomState } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface LobbyViewProps {
  room: RoomState;
  currentUserId: string;
  onReorder: (newPlayers: Player[]) => void;
  onStartGame: () => void;
}

export const LobbyView = ({ room, currentUserId, onReorder, onStartGame }: LobbyViewProps) => {
  const isHost = room.hostId === currentUserId;
  const players = room.players;
  const settings = room.settings;

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const copyListItems = [...players];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    onReorder(copyListItems);
  };
  
  const windLabels: {[key: string]: string} = {
      'East': '東', 'South': '南', 'West': '西', 'North': '北'
  };
  
  // NOTE: In Lobby, we just display the ORDER 1, 2, 3, 4. 
  // The actual Wind property might not be set correctly until game starts or matches index.
  // We assume Index 0 = East, Index 1 = South, etc. for the *First* game.
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
            <h2>待機ルーム</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <p>ID: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{room.id}</span></p>
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
                    color: 'var(--color-text-primary)'
                  }}
                  title="QRコードを表示"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </button>
            </div>
            {!isHost && <p style={{ color: 'var(--color-text-secondary)' }}>ホストがゲームを開始するのを待っています...</p>}
        </div>

        <Modal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} title="ルームへのリンク">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px' }}>
                <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                    <QRCode value={window.location.href} size={200} />
                </div>
                <p style={{ wordBreak: 'break-all', fontSize: '0.9rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    {window.location.href}
                </p>
            </div>
        </Modal>

        <div style={{ background: 'var(--color-bg-card)', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>参加者 ({players.length}/{settings.mode === '4ma' ? 4 : 3})</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                {isHost ? 'ドラッグして席順を変更できます (上から東, 南...)' : 'ホストが席順を決定します'}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {players.map((player, index) => (
                    <div 
                        key={player.id}
                        draggable={isHost}
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            background: player.id === currentUserId ? 'rgba(76, 175, 80, 0.2)' : 'var(--color-bg-main)',
                            border: `1px solid ${player.id === currentUserId ? 'var(--color-primary)' : '#444'}`,
                            borderRadius: '6px',
                            cursor: isHost ? 'grab' : 'default',
                            color: 'var(--color-text-primary)'
                        }}
                    >
                        <span style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: '#555', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            marginRight: '12px',
                            fontSize: '0.8rem'
                        }}>
                           {Object.values(windLabels)[index] || '?'}
                        </span>
                        <span style={{ fontWeight: 'bold', flex: 1 }}>{player.name} {player.id === currentUserId && '(自分)'}</span>
                        {player.id === room.hostId && <span style={{ fontSize: '0.7rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>HOST</span>}
                    </div>
                ))}
                
                {Array.from({ length: (settings.mode === '4ma' ? 4 : 3) - players.length }).map((_, i) => (
                     <div key={`empty-${i}`} style={{ padding: '12px', border: '1px dashed #555', borderRadius: '6px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                        Waiting...
                     </div>
                ))}
            </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>ルール設定</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                <div>モード: {settings.mode === '4ma' ? '4人麻雀' : '3人麻雀'}</div>
                <div>長さ: {settings.length === 'Hanchan' ? '半荘戦' : '東風戦'}</div>
                <div>配給原点: {settings.startPoint}</div>
                <div>返し: {settings.returnPoint}</div>
                <div>ウマ: {settings.uma.join('-')}</div>
                <div>本場: {settings.hasHonba ? `${settings.honbaPoints}点` : 'なし'}</div>
                <div>飛び: {settings.useTobi ? 'あり' : 'なし'}</div>
                <div>チップ: {settings.useChip ? 'あり' : 'なし'}</div>
            </div>
        </div>

        {isHost && (
            <div style={{ marginTop: '16px' }}>
                <Button 
                    onClick={onStartGame} 
                    disabled={players.length < (settings.mode === '4ma' ? 3 : 2)} // Allow 3 starts for 4ma if testing? Strict: 4.
                    style={{ width: '100%', padding: '16px', fontSize: '1.2rem' }}
                >
                    ゲーム開始
                </Button>
                {players.length < (settings.mode === '4ma' ? 4 : 3) && (
                    <p style={{ textAlign: 'center', color: 'var(--color-danger)', fontSize: '0.8rem' }}>
                        ※ 人数が足りませんが開始できます (テスト用)
                    </p>
                )}
            </div>
        )}
    </div>
  );
};
