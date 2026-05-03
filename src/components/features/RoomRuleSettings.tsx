import React, { useState } from 'react';
import type { GameSettings, NoFuFixedPointHan } from '../../types';
import { cloneNoFuFixedPoints, normalizeYakitoriPoint } from '../../utils/gameSettings';
import { normalizePointUnit } from '../../utils/pointUnit';
import { createDefaultRoomSettings } from '../../utils/roomDefaults';
import {
  detectUmaPreset,
  getUmaPresetValue,
  type UmaPreset,
  UMA_PRESET_LABELS,
  UMA_PRESET_ORDER,
} from '../../utils/uma';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';

const NO_FU_FIXED_POINT_HAN_LIST: NoFuFixedPointHan[] = [1, 2, 3];

interface RoomRuleSettingsProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  disabled?: boolean;
}

const detectPointPreset = (
  settings: GameSettings,
): '25000-30000' | '30000-30000' | '35000-40000' | 'custom' => {
  if (settings.startPoint === 25000 && settings.returnPoint === 30000) return '25000-30000';
  if (settings.startPoint === 30000 && settings.returnPoint === 30000) return '30000-30000';
  if (settings.startPoint === 35000 && settings.returnPoint === 40000) return '35000-40000';
  return 'custom';
};

export const RoomRuleSettings: React.FC<RoomRuleSettingsProps> = ({
  settings,
  onChange,
  disabled = false,
}) => {
  const [isCustomPointSelected, setIsCustomPointSelected] = useState(
    () => detectPointPreset(settings) === 'custom',
  );
  const [isCustomUmaSelected, setIsCustomUmaSelected] = useState(
    () => detectUmaPreset(settings.uma) === 'custom',
  );

  const pointPreset = isCustomPointSelected ? 'custom' : detectPointPreset(settings);
  const umaPreset: UmaPreset = isCustomUmaSelected ? 'custom' : detectUmaPreset(settings.uma);
  const noFuFixedPoints = settings.noFuFixedPoints ?? cloneNoFuFixedPoints();

  const handleChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const applyModeDefaults = (mode: '4ma' | '3ma') => {
    const nextDefaults = createDefaultRoomSettings(mode);
    setIsCustomPointSelected(false);

    if (mode === '4ma') {
      onChange({
        ...nextDefaults,
        ...settings,
        mode: '4ma',
        uma: [5, 10],
        startPoint: 25000,
        returnPoint: 30000,
        useOka: true,
        useFuCalculation: true,
        westExtension: false,
        rate: 50,
      });
      return;
    }

    onChange({
      ...nextDefaults,
      ...settings,
      mode: '3ma',
      uma: [10, 20],
      startPoint: 35000,
      returnPoint: 40000,
      honbaPoints: 1500,
      useOka: true,
      useFuCalculation: true,
      westExtension: false,
      rate: 50,
    });
  };

  const applyPointPreset = (preset: '25000-30000' | '30000-30000' | '35000-40000' | 'custom') => {
    if (preset === 'custom') {
      setIsCustomPointSelected(true);
      return;
    }

    setIsCustomPointSelected(false);
    if (preset === '25000-30000') {
      onChange({ ...settings, startPoint: 25000, returnPoint: 30000 });
      return;
    }

    if (preset === '30000-30000') {
      onChange({ ...settings, startPoint: 30000, returnPoint: 30000 });
      return;
    }

    onChange({ ...settings, startPoint: 35000, returnPoint: 40000 });
  };

  const applyUmaPreset = (preset: UmaPreset) => {
    if (preset === 'custom') {
      setIsCustomUmaSelected(true);
      return;
    }

    setIsCustomUmaSelected(false);
    handleChange('uma', getUmaPresetValue(preset));
  };

  const handleNoFuFixedPointChange = (
    han: NoFuFixedPointHan,
    target: 'child' | 'dealer',
    delta: number,
  ) => {
    const nextNoFuFixedPoints = cloneNoFuFixedPoints(noFuFixedPoints);
    nextNoFuFixedPoints[han] = {
      ...nextNoFuFixedPoints[han],
      [target]: Math.max(100, nextNoFuFixedPoints[han][target] + delta),
    };

    onChange({
      ...settings,
      noFuFixedPoints: nextNoFuFixedPoints,
    });
  };

  return (
    <>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>モード</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant={settings.mode === '4ma' ? 'primary' : 'secondary'}
            onClick={() => applyModeDefaults('4ma')}
            style={{ flex: 1 }}
            disabled={disabled}
          >
            4人打ち
          </Button>
          <Button
            type="button"
            variant={settings.mode === '3ma' ? 'primary' : 'secondary'}
            onClick={() => applyModeDefaults('3ma')}
            style={{ flex: 1 }}
            disabled={disabled}
          >
            3人打ち
          </Button>
        </div>
      </div>

      <div>
        <Switch
          checked={settings.isSingleMode || false}
          onChange={(checked) => handleChange('isSingleMode', checked)}
          label="単独モード (1台で操作)"
          disabled={disabled}
        />
      </div>

      <hr style={{ width: '100%', border: '1px solid #444' }} />

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          配給原点 / カエシ点
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <Button
            type="button"
            size="small"
            variant={pointPreset === '25000-30000' ? 'primary' : 'secondary'}
            onClick={() => applyPointPreset('25000-30000')}
            disabled={disabled}
          >
            25000 / 30000
          </Button>
          <Button
            type="button"
            size="small"
            variant={pointPreset === '30000-30000' ? 'primary' : 'secondary'}
            onClick={() => applyPointPreset('30000-30000')}
            disabled={disabled}
          >
            30000 / 30000
          </Button>
          {settings.mode === '3ma' && (
            <Button
              type="button"
              size="small"
              variant={pointPreset === '35000-40000' ? 'primary' : 'secondary'}
              onClick={() => applyPointPreset('35000-40000')}
              disabled={disabled}
            >
              35000 / 40000
            </Button>
          )}
          <Button
            type="button"
            size="small"
            variant={pointPreset === 'custom' ? 'primary' : 'secondary'}
            onClick={() => applyPointPreset('custom')}
            disabled={disabled}
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
                onChange={(e) =>
                  handleChange('startPoint', normalizePointUnit(Number(e.target.value)))
                }
                step={1000}
                fullWidth
                disabled={disabled}
              />
            </label>
            <label>
              返し点
              <Input
                type="number"
                value={settings.returnPoint}
                onChange={(e) =>
                  handleChange('returnPoint', normalizePointUnit(Number(e.target.value)))
                }
                step={1000}
                fullWidth
                disabled={disabled}
              />
            </label>
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          ウマ (順位点)
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {UMA_PRESET_ORDER.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="small"
              variant={umaPreset === preset ? 'primary' : 'secondary'}
              onClick={() => applyUmaPreset(preset)}
              disabled={disabled}
            >
              {UMA_PRESET_LABELS[preset]}
            </Button>
          ))}
          <Button
            type="button"
            size="small"
            variant={umaPreset === 'custom' ? 'primary' : 'secondary'}
            onClick={() => applyUmaPreset('custom')}
            disabled={disabled}
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
              disabled={disabled}
            />
            <span>-</span>
            <Input
              type="number"
              value={settings.uma[1]}
              onChange={(e) => handleChange('uma', [settings.uma[0], Number(e.target.value)])}
              style={{ width: '60px' }}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          精算レート
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[30, 50, 100].map((rate) => (
            <Button
              key={rate}
              type="button"
              size="small"
              variant={settings.rate === rate ? 'primary' : 'secondary'}
              onClick={() => handleChange('rate', rate)}
              disabled={disabled}
            >
              {rate}
            </Button>
          ))}
          <Button
            type="button"
            size="small"
            variant={![30, 50, 100].includes(settings.rate) ? 'primary' : 'secondary'}
            onClick={() => handleChange('rate', 0)}
            disabled={disabled}
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
                disabled={disabled}
              />
            </label>
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          ルール詳細
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Switch
            checked={settings.yakitoriEnabled ?? false}
            onChange={(checked) => handleChange('yakitoriEnabled', checked)}
            label="焼き鳥あり"
            disabled={disabled}
          />

          {(settings.yakitoriEnabled ?? false) && (
            <div
              style={{
                padding: '10px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }}
            >
              <label>
                焼き鳥点 (精算点)
                <Input
                  type="number"
                  aria-label="焼き鳥点 (精算点)"
                  value={settings.yakitoriPoint ?? 10}
                  onChange={(e) =>
                    handleChange('yakitoriPoint', normalizeYakitoriPoint(Number(e.target.value)))
                  }
                  min={1}
                  step={1}
                  style={{ marginLeft: '8px', width: '80px' }}
                  disabled={disabled}
                />
              </label>
            </div>
          )}

          <Switch
            checked={settings.tenpaiRenchan}
            onChange={(checked) => handleChange('tenpaiRenchan', checked)}
            label="テンパイ連荘 (親がノーテンでも流局しない)"
            disabled={disabled}
          />

          <Switch
            checked={settings.useTobi}
            onChange={(checked) => handleChange('useTobi', checked)}
            label="トビ終了あり"
            disabled={disabled}
          />

          <Switch
            checked={settings.useChip}
            onChange={(checked) => handleChange('useChip', checked)}
            label="チップあり"
            disabled={disabled}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Switch
              checked={settings.hasHonba}
              onChange={(checked) => handleChange('hasHonba', checked)}
              label="積み棒あり"
              disabled={disabled}
            />

            {settings.hasHonba && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}
              >
                <span>1本場:</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() =>
                      handleChange('honbaPoints', Math.max(0, settings.honbaPoints - 100))
                    }
                    style={{ padding: '2px 8px', minWidth: '30px' }}
                    disabled={disabled}
                  >
                    -
                  </Button>
                  <span style={{ margin: '0 8px', minWidth: '40px', textAlign: 'center' }}>
                    {settings.honbaPoints}
                  </span>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() => handleChange('honbaPoints', settings.honbaPoints + 100)}
                    style={{ padding: '2px 8px', minWidth: '30px' }}
                    disabled={disabled}
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
              disabled={disabled}
            />
          </div>

          {!settings.useFuCalculation && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>1〜3翻 固定点</div>
              {NO_FU_FIXED_POINT_HAN_LIST.map((han) => (
                <div
                  key={han}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '72px 1fr 1fr',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <span>{han}翻</span>
                  {(['child', 'dealer'] as const).map((target) => (
                    <div
                      key={target}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span style={{ minWidth: '24px' }}>{target === 'child' ? '子' : '親'}</span>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => handleNoFuFixedPointChange(han, target, -100)}
                        style={{ padding: '2px 8px', minWidth: '30px' }}
                        disabled={disabled}
                      >
                        -
                      </Button>
                      <span style={{ minWidth: '56px', textAlign: 'center' }}>
                        {noFuFixedPoints[han][target]}
                      </span>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => handleNoFuFixedPointChange(han, target, 100)}
                        style={{ padding: '2px 8px', minWidth: '30px' }}
                        disabled={disabled}
                      >
                        +
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <Switch
              checked={settings.westExtension}
              onChange={(checked) => handleChange('westExtension', checked)}
              label="西入あり (返し点未満の場合延長)"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </>
  );
};
