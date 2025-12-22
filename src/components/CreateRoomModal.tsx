import React, { useEffect, useState } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { GameSettings } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Switch } from './ui/Switch';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (settings: GameSettings, hostName: string, otherPlayerNames?: string[]) => void;
  loading?: boolean;
}

const DEFAULT_SETTINGS_4MA: GameSettings = {
  mode: '4ma',
  length: 'Hanchan',
  startPoint: 25000,
  returnPoint: 30000,
  uma: [5, 10], // Default per design
  hasHonba: true,
  honbaPoints: 300,
  tenpaiRenchan: true,
  useTobi: true,
  useChip: false,
  chipRate: 0,
  useOka: true,
  isSingleMode: false,
  useFuCalculation: true,
  westExtension: false,
  rate: 50,
};

const DEFAULT_SETTINGS_3MA: GameSettings = {
  mode: '3ma',
  length: 'Hanchan',
  startPoint: 35000,
  returnPoint: 40000,
  uma: [10, 20], // Provisional default for 3ma
  hasHonba: true,
  honbaPoints: 1500,
  tenpaiRenchan: true,
  useTobi: true,
  useChip: false,
  chipRate: 0,
  useOka: true,
  isSingleMode: false,
  useFuCalculation: true,
  westExtension: false,
  rate: 50,
};

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  loading = false,
}) => {
  const { showSnackbar } = useSnackbar();
  const [mode, setMode] = useState<'4ma' | '3ma'>('4ma');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS_4MA);
  const [hostName, setHostName] = useState(() => localStorage.getItem('mahjong_player_name') || '');
  const [otherPlayerNames, setOtherPlayerNames] = useState<string[]>(['', '', '']); // Max 3 others

  // Reset/Switch defaults when mode changes
  useEffect(() => {
    if (mode === '4ma') {
      setTimeout(() => {
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS_4MA,
          ...prev,
          mode: '4ma',
          uma: [5, 10],
          startPoint: 25000,
          returnPoint: 30000,
          useOka: true,
          useFuCalculation: true,
          westExtension: false,
          rate: 50,
        }));
        setOtherPlayerNames(['', '', '']);
      }, 0);
    } else {
      setTimeout(() => {
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS_3MA,
          ...prev,
          mode: '3ma',
          uma: [10, 20],
          startPoint: 35000,
          returnPoint: 40000,
          honbaPoints: 1500,
          useOka: true,
          useFuCalculation: true,
          westExtension: false,
          rate: 50,
        }));
        setOtherPlayerNames(['', '']);
      }, 0);
    }
  }, [mode]);

  const handleChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Check if current settings match a preset
  const getPointPreset = React.useCallback(():
    | '25000-30000'
    | '30000-30000'
    | '35000-40000'
    | 'custom' => {
    if (settings.startPoint === 25000 && settings.returnPoint === 30000) return '25000-30000';
    if (settings.startPoint === 30000 && settings.returnPoint === 30000) return '30000-30000';
    if (settings.startPoint === 35000 && settings.returnPoint === 40000) return '35000-40000';
    return 'custom';
  }, [settings.startPoint, settings.returnPoint]);

  const getUmaPreset = React.useCallback((): '5-10' | '10-20' | '10-30' | 'custom' => {
    if (settings.uma[0] === 5 && settings.uma[1] === 10) return '5-10';
    if (settings.uma[0] === 10 && settings.uma[1] === 20) return '10-20';
    if (settings.uma[0] === 10 && settings.uma[1] === 30) return '10-30';
    return 'custom';
  }, [settings.uma]);

  const [pointPreset, setPointPreset] = useState<
    '25000-30000' | '30000-30000' | '35000-40000' | 'custom'
  >(() => {
    // Initial calculation needs to access function but before declaration if using const...
    // React allows using function defined above in useState initializer if component renders top-down.
    // However, if we use callback, we must define callback first.
    if (settings.startPoint === 25000 && settings.returnPoint === 30000) return '25000-30000';
    if (settings.startPoint === 30000 && settings.returnPoint === 30000) return '30000-30000';
    if (settings.startPoint === 35000 && settings.returnPoint === 40000) return '35000-40000';
    return 'custom';
  });

  const [umaPreset, setUmaPreset] = useState<'5-10' | '10-20' | '10-30' | 'custom'>(() => {
    if (settings.uma[0] === 5 && settings.uma[1] === 10) return '5-10';
    if (settings.uma[0] === 10 && settings.uma[1] === 20) return '10-20';
    if (settings.uma[0] === 10 && settings.uma[1] === 30) return '10-30';
    return 'custom';
  });

  // Sync presets with settings on load or external change (if any)
  useEffect(() => {
    setTimeout(() => {
      setPointPreset(getPointPreset());
      setUmaPreset(getUmaPreset());
    }, 0);
  }, [settings.startPoint, settings.returnPoint, settings.uma, getPointPreset, getUmaPreset]);

  const applyPointPreset = (preset: '25000-30000' | '30000-30000' | '35000-40000' | 'custom') => {
    setPointPreset(preset);
    if (preset === '25000-30000') {
      handleChange('startPoint', 25000);
      handleChange('returnPoint', 30000);
    } else if (preset === '30000-30000') {
      handleChange('startPoint', 30000);
      handleChange('returnPoint', 30000);
    } else if (preset === '35000-40000') {
      handleChange('startPoint', 35000);
      handleChange('returnPoint', 40000);
    }
  };

  const applyUmaPreset = (preset: '5-10' | '10-20' | '10-30' | 'custom') => {
    setUmaPreset(preset);
    if (preset === '5-10') handleChange('uma', [5, 10]);
    else if (preset === '10-20') handleChange('uma', [10, 20]);
    else if (preset === '10-30') handleChange('uma', [10, 30]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="部屋作成設定">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Host Name Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            あなたの名前
          </label>
          <Input
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="表示名を入力"
            fullWidth
          />
        </div>

        {/* Mode Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            モード
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant={mode === '4ma' ? 'primary' : 'secondary'}
              onClick={() => setMode('4ma')}
              style={{ flex: 1 }}
            >
              4人打ち
            </Button>
            <Button
              variant={mode === '3ma' ? 'primary' : 'secondary'}
              onClick={() => setMode('3ma')}
              style={{ flex: 1 }}
            >
              3人打ち
            </Button>
          </div>
        </div>

        {/* Single Mode Toggle */}
        <div>
          <Switch
            checked={settings.isSingleMode || false}
            onChange={(checked) => handleChange('isSingleMode', checked)}
            label="単独モード (1台で操作)"
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
                      const newNames = [...otherPlayerNames];
                      newNames[idx] = e.target.value;
                      setOtherPlayerNames(newNames);
                    }}
                    placeholder={`プレイヤー${idx + 2}の名前`}
                    fullWidth
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <hr style={{ width: '100%', border: '1px solid #444' }} />

        {/* Basic Settings (Points) */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            配給原点 / カエシ点
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant={pointPreset === '25000-30000' ? 'primary' : 'secondary'}
              onClick={() => applyPointPreset('25000-30000')}
            >
              25000 / 30000
            </Button>
            <Button
              size="small"
              variant={pointPreset === '30000-30000' ? 'primary' : 'secondary'}
              onClick={() => applyPointPreset('30000-30000')}
            >
              30000 / 30000
            </Button>
            {mode === '3ma' && (
              <Button
                size="small"
                variant={pointPreset === '35000-40000' ? 'primary' : 'secondary'}
                onClick={() => applyPointPreset('35000-40000')}
              >
                35000 / 40000
              </Button>
            )}
            <Button
              size="small"
              variant={pointPreset === 'custom' ? 'primary' : 'secondary'}
              onClick={() => applyPointPreset('custom')}
            >
              カスタム
            </Button>
          </div>

          {pointPreset === 'custom' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }}
            >
              <label>
                配給原点
                <Input
                  type="number"
                  value={settings.startPoint}
                  onChange={(e) => handleChange('startPoint', Number(e.target.value))}
                  fullWidth
                />
              </label>
              <label>
                返し点
                <Input
                  type="number"
                  value={settings.returnPoint}
                  onChange={(e) => handleChange('returnPoint', Number(e.target.value))}
                  fullWidth
                />
              </label>
            </div>
          )}
        </div>

        {/* Uma Settings */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            ウマ (順位点)
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant={umaPreset === '5-10' ? 'primary' : 'secondary'}
              onClick={() => applyUmaPreset('5-10')}
            >
              ゴットー (5-10)
            </Button>
            <Button
              size="small"
              variant={umaPreset === '10-20' ? 'primary' : 'secondary'}
              onClick={() => applyUmaPreset('10-20')}
            >
              ワンツー (10-20)
            </Button>
            <Button
              size="small"
              variant={umaPreset === '10-30' ? 'primary' : 'secondary'}
              onClick={() => applyUmaPreset('10-30')}
            >
              ワンスリー (10-30)
            </Button>
            <Button
              size="small"
              variant={umaPreset === 'custom' ? 'primary' : 'secondary'}
              onClick={() => applyUmaPreset('custom')}
            >
              カスタム
            </Button>
          </div>
          {umaPreset === 'custom' && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '8px',
                alignItems: 'center',
                padding: '10px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }}
            >
              <Input
                type="number"
                value={settings.uma[0]}
                onChange={(e) => handleChange('uma', [Number(e.target.value), settings.uma[1]])}
                style={{ width: '60px' }}
              />
              <span>-</span>
              <Input
                type="number"
                value={settings.uma[1]}
                onChange={(e) => handleChange('uma', [settings.uma[0], Number(e.target.value)])}
                style={{ width: '60px' }}
              />
            </div>
          )}
        </div>

        {/* Rate Settings */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            精算レート
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[30, 50, 100].map((r) => (
              <Button
                key={r}
                size="small"
                variant={settings.rate === r ? 'primary' : 'secondary'}
                onClick={() => handleChange('rate', r)}
              >
                {r}
              </Button>
            ))}
            <Button
              size="small"
              variant={![30, 50, 100].includes(settings.rate) ? 'primary' : 'secondary'}
              onClick={() => handleChange('rate', 0)} // Set to 0 temporarily or keep current if custom? Logic below
            >
              カスタム
            </Button>
          </div>
          {![30, 50, 100].includes(settings.rate) && (
            <div
              style={{
                marginTop: '8px',
                padding: '10px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }}
            >
              <label>
                レート
                <Input
                  type="number"
                  value={settings.rate}
                  onChange={(e) => handleChange('rate', Number(e.target.value))}
                  style={{ marginLeft: '8px', width: '80px' }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Rules */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            ルール詳細
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Switch
              checked={settings.tenpaiRenchan}
              onChange={(checked) => handleChange('tenpaiRenchan', checked)}
              label="テンパイ連荘 (親がノーテンでも流局しない)"
            />

            <Switch
              checked={settings.useTobi}
              onChange={(checked) => handleChange('useTobi', checked)}
              label="トビ終了あり"
            />

            <Switch
              checked={settings.useChip}
              onChange={(checked) => handleChange('useChip', checked)}
              label="チップあり"
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Switch
                checked={settings.hasHonba}
                onChange={(checked) => handleChange('hasHonba', checked)}
                label="積み棒あり"
              />

              {settings.hasHonba && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}
                >
                  <span>1本場:</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() =>
                        handleChange('honbaPoints', Math.max(0, settings.honbaPoints - 100))
                      }
                      style={{ padding: '2px 8px', minWidth: '30px' }}
                    >
                      -
                    </Button>
                    <span style={{ margin: '0 8px', minWidth: '40px', textAlign: 'center' }}>
                      {settings.honbaPoints}
                    </span>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => handleChange('honbaPoints', settings.honbaPoints + 100)}
                      style={{ padding: '2px 8px', minWidth: '30px' }}
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '12px' }}>
              <Switch
                checked={settings.useFuCalculation}
                onChange={(checked) => handleChange('useFuCalculation', checked)}
                label="符計算あり (OFFで簡易計算: 1-3翻固定・4翻以降満貫)"
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <Switch
                checked={settings.westExtension}
                onChange={(checked) => handleChange('westExtension', checked)}
                label="西入あり (返し点未満の場合延長)"
              />
            </div>
          </div>
        </div>

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
                localStorage.setItem('mahjong_player_name', name);
                onCreate(settings, name, others);
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
