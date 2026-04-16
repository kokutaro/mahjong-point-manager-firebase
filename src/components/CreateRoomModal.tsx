import React, { useEffect, useRef, useState } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { GameSettings } from '../types';
import { createDefaultRoomSettings, normalizeRoomDefaultSettings } from '../utils/roomDefaults';
import { readStoredPlayerName, writeStoredPlayerName } from '../utils/userSettings';
import { RoomRuleSettings } from './features/RoomRuleSettings';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    settings: GameSettings,
    hostName: string,
    otherPlayerNames?: string[],
    roomName?: string,
  ) => void;
  loading?: boolean;
  initialHostName?: string;
  initialSettings?: GameSettings;
}

const getOtherPlayerSlots = (mode: '4ma' | '3ma'): string[] =>
  mode === '4ma' ? ['', '', ''] : ['', ''];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  loading = false,
  initialHostName,
  initialSettings,
}) => {
  const { showSnackbar } = useSnackbar();
  const [editorKey, setEditorKey] = useState(0);
  const wasOpenRef = useRef(false);
  const hostNameDirtyRef = useRef(false);
  const roomNameDirtyRef = useRef(false);
  const otherPlayerNamesDirtyRef = useRef(false);
  const settingsDirtyRef = useRef(false);
  const [settings, setSettings] = useState<GameSettings>(() =>
    normalizeRoomDefaultSettings(initialSettings ?? createDefaultRoomSettings('4ma')),
  );
  const [hostName, setHostName] = useState(() => initialHostName ?? readStoredPlayerName());
  const [roomName, setRoomName] = useState('');
  const [otherPlayerNames, setOtherPlayerNames] = useState<string[]>(() =>
    getOtherPlayerSlots(settings.mode),
  );

  const resetDirtyFlags = () => {
    hostNameDirtyRef.current = false;
    roomNameDirtyRef.current = false;
    otherPlayerNamesDirtyRef.current = false;
    settingsDirtyRef.current = false;
  };

  const handleSettingsChange = (nextSettings: GameSettings) => {
    settingsDirtyRef.current = true;
    setSettings(nextSettings);
  };

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      resetDirtyFlags();
      return;
    }

    const nextSettings = normalizeRoomDefaultSettings(
      initialSettings ?? createDefaultRoomSettings('4ma'),
    );
    const isOpening = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (isOpening) {
      resetDirtyFlags();
      setSettings(nextSettings);
      setHostName(initialHostName ?? readStoredPlayerName());
      setRoomName('');
      setOtherPlayerNames(getOtherPlayerSlots(nextSettings.mode));
      setEditorKey((current) => current + 1);
      return;
    }

    if (!hostNameDirtyRef.current) {
      setHostName(initialHostName ?? readStoredPlayerName());
    }

    if (!settingsDirtyRef.current && !otherPlayerNamesDirtyRef.current) {
      setSettings(nextSettings);
      setOtherPlayerNames(getOtherPlayerSlots(nextSettings.mode));
      setEditorKey((current) => current + 1);
    }
  }, [initialHostName, initialSettings, isOpen]);

  useEffect(() => {
    setOtherPlayerNames((current) => {
      const expectedLength = settings.mode === '4ma' ? 3 : 2;
      return Array.from({ length: expectedLength }, (_, index) => current[index] ?? '');
    });
  }, [settings.mode]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="部屋作成設定">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Room Name Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            部屋の名前 (任意)
          </label>
          <Input
            value={roomName}
            onChange={(e) => {
              roomNameDirtyRef.current = true;
              setRoomName(e.target.value);
            }}
            placeholder="例: 金曜日の麻雀大会"
            fullWidth
          />
        </div>

        {/* Host Name Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            あなたの名前
          </label>
          <Input
            value={hostName}
            onChange={(e) => {
              hostNameDirtyRef.current = true;
              setHostName(e.target.value);
            }}
            placeholder="表示名を入力"
            fullWidth
          />
        </div>

        <RoomRuleSettings
          key={editorKey}
          settings={settings}
          onChange={handleSettingsChange}
          disabled={loading}
        />

        {settings.isSingleMode && (
          <div
            style={{
              marginTop: '8px',
              padding: '10px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#ccc' }}>
              他のプレイヤー名を入力してください
            </p>
            {otherPlayerNames.map((name, idx) => (
              <div key={idx} style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>
                  Player {idx + 2}
                </label>
                <Input
                  value={name}
                  onChange={(e) => {
                    otherPlayerNamesDirtyRef.current = true;
                    const nextNames = [...otherPlayerNames];
                    nextNames[idx] = e.target.value;
                    setOtherPlayerNames(nextNames);
                  }}
                  placeholder={`プレイヤー${idx + 2}の名前`}
                  fullWidth
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const name = hostName.trim();
              const others = settings.isSingleMode
                ? otherPlayerNames.map((n) => n.trim())
                : undefined;

              // Validate others if single mode
              if (settings.isSingleMode) {
                if (others?.some((n) => !n)) {
                  showSnackbar('すべてのプレイヤー名を入力してください', { position: 'top' });
                  return;
                }
              }

              if (name) {
                writeStoredPlayerName(name);
                onCreate(settings, name, others, roomName);
              }
            }}
            disabled={loading || !hostName.trim()}
            style={{ paddingLeft: '32px', paddingRight: '32px' }}
          >
            部屋作成
          </Button>
        </div>
      </div>
    </Modal>
  );
};
