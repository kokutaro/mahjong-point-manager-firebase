import React, { useState } from 'react';
import type { CompetitionSettings, NoFuFixedPointHan } from '../../types';
import { cloneNoFuFixedPoints } from '../../utils/gameSettings';
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
import styles from './CompetitionRuleSettings.module.css';

const NO_FU_FIXED_POINT_HAN_LIST: NoFuFixedPointHan[] = [1, 2, 3];

interface CompetitionRuleSettingsProps {
  settings: CompetitionSettings;
  onChange: (settings: CompetitionSettings) => void;
  disabled?: boolean;
}

export const CompetitionRuleSettings: React.FC<CompetitionRuleSettingsProps> = ({
  settings,
  onChange,
  disabled = false,
}) => {
  const [isCustomUmaSelected, setIsCustomUmaSelected] = useState(
    () => detectUmaPreset(settings.uma) === 'custom',
  );
  const umaPreset: UmaPreset = isCustomUmaSelected ? 'custom' : detectUmaPreset(settings.uma);

  const handleChange = <K extends keyof CompetitionSettings>(
    key: K,
    value: CompetitionSettings[K],
  ) => {
    onChange({ ...settings, [key]: value });
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
    const nextNoFuFixedPoints = cloneNoFuFixedPoints(settings.noFuFixedPoints);
    nextNoFuFixedPoints[han] = {
      ...nextNoFuFixedPoints[han],
      [target]: Math.max(100, nextNoFuFixedPoints[han][target] + delta),
    };
    onChange({ ...settings, noFuFixedPoints: nextNoFuFixedPoints });
  };

  const noFuFixedPoints = settings.noFuFixedPoints ?? cloneNoFuFixedPoints();

  return (
    <div className={styles.container}>
      {/* 対局形式 */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>対局形式</label>
        <div className={styles.buttonRow}>
          <Button
            type="button"
            variant={settings.length === 'Hanchan' ? 'primary' : 'secondary'}
            onClick={() => handleChange('length', 'Hanchan')}
            disabled={disabled}
            style={{ flex: 1 }}
          >
            半荘
          </Button>
          <Button
            type="button"
            variant={settings.length === 'Tonpu' ? 'primary' : 'secondary'}
            onClick={() => handleChange('length', 'Tonpu')}
            disabled={disabled}
            style={{ flex: 1 }}
          >
            東風
          </Button>
        </div>
      </div>

      {/* 配給原点 */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>配給原点</label>
        <div className={styles.gridRow}>
          <div>
            <span className={styles.subLabel}>4麻</span>
            <Input
              type="number"
              value={settings.startPoint4ma}
              onChange={(e) => handleChange('startPoint4ma', Number(e.target.value))}
              disabled={disabled}
              fullWidth
            />
          </div>
          <div>
            <span className={styles.subLabel}>3麻</span>
            <Input
              type="number"
              value={settings.startPoint3ma}
              onChange={(e) => handleChange('startPoint3ma', Number(e.target.value))}
              disabled={disabled}
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* 返し点 */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>返し点</label>
        <div className={styles.gridRow}>
          <div>
            <span className={styles.subLabel}>4麻</span>
            <Input
              type="number"
              value={settings.returnPoint4ma}
              onChange={(e) => handleChange('returnPoint4ma', Number(e.target.value))}
              disabled={disabled}
              fullWidth
            />
          </div>
          <div>
            <span className={styles.subLabel}>3麻</span>
            <Input
              type="number"
              value={settings.returnPoint3ma}
              onChange={(e) => handleChange('returnPoint3ma', Number(e.target.value))}
              disabled={disabled}
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* ウマ */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>ウマ (順位点)</label>
        <div className={styles.presetRow}>
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
          <div className={styles.gridRow}>
            <div>
              <span className={styles.subLabel}>2着/3着</span>
              <Input
                type="number"
                value={settings.uma[0]}
                onChange={(e) => {
                  setIsCustomUmaSelected(true);
                  handleChange('uma', [Number(e.target.value), settings.uma[1]]);
                }}
                disabled={disabled}
                fullWidth
              />
            </div>
            <div>
              <span className={styles.subLabel}>1着/4着</span>
              <Input
                type="number"
                value={settings.uma[1]}
                onChange={(e) => {
                  setIsCustomUmaSelected(true);
                  handleChange('uma', [settings.uma[0], Number(e.target.value)]);
                }}
                disabled={disabled}
                fullWidth
              />
            </div>
          </div>
        )}
      </div>

      {/* レート */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>レート</label>
        <div className={styles.rateSection}>
          <div className={styles.presetRow}>
            {[0, 30, 50, 100].map((r) => (
              <Button
                key={r}
                type="button"
                size="small"
                variant={settings.rate === r ? 'primary' : 'secondary'}
                onClick={() => handleChange('rate', r)}
                disabled={disabled}
              >
                {r === 0 ? 'なし' : r}
              </Button>
            ))}
          </div>
          {![0, 30, 50, 100].includes(settings.rate) && (
            <Input
              type="number"
              value={settings.rate}
              onChange={(e) => handleChange('rate', Math.max(0, Number(e.target.value)))}
              disabled={disabled}
              fullWidth
            />
          )}
        </div>
      </div>

      <hr className={styles.divider} />

      {/* Switch 設定群 */}
      <div className={styles.switchGroup}>
        <Switch
          checked={settings.tenpaiRenchan}
          onChange={(checked) => handleChange('tenpaiRenchan', checked)}
          label="テンパイ連荘"
          disabled={disabled}
        />
        <Switch
          checked={settings.useTobi}
          onChange={(checked) => handleChange('useTobi', checked)}
          label="トビ (ハコ割れ終了)"
          disabled={disabled}
        />
        <Switch
          checked={settings.useOka}
          onChange={(checked) => handleChange('useOka', checked)}
          label="オカ"
          disabled={disabled}
        />
        <Switch
          checked={settings.westExtension}
          onChange={(checked) => handleChange('westExtension', checked)}
          label="西入 (延長)"
          disabled={disabled}
        />

        {/* 本場 */}
        <Switch
          checked={settings.hasHonba}
          onChange={(checked) => handleChange('hasHonba', checked)}
          label="本場あり"
          disabled={disabled}
        />
        {settings.hasHonba && (
          <div className={styles.conditionalSection}>
            <div className={styles.stepperRow}>
              <span>1本場:</span>
              <Button
                type="button"
                size="small"
                variant="secondary"
                onClick={() => handleChange('honbaPoints', Math.max(0, settings.honbaPoints - 100))}
                disabled={disabled}
                style={{ padding: '2px 8px', minWidth: '30px' }}
              >
                -
              </Button>
              <span className={styles.stepperValue}>{settings.honbaPoints}</span>
              <Button
                type="button"
                size="small"
                variant="secondary"
                onClick={() => handleChange('honbaPoints', settings.honbaPoints + 100)}
                disabled={disabled}
                style={{ padding: '2px 8px', minWidth: '30px' }}
              >
                +
              </Button>
            </div>
          </div>
        )}

        {/* チップ */}
        <Switch
          checked={settings.useChip}
          onChange={(checked) => handleChange('useChip', checked)}
          label="チップ"
          disabled={disabled}
        />
        {settings.useChip && (
          <div className={styles.conditionalSection}>
            <div className={styles.stepperRow}>
              <span>チップレート:</span>
              <Button
                type="button"
                size="small"
                variant="secondary"
                onClick={() => handleChange('chipRate', Math.max(0, (settings.chipRate ?? 0) - 10))}
                disabled={disabled}
                style={{ padding: '2px 8px', minWidth: '30px' }}
              >
                -
              </Button>
              <span className={styles.stepperValue}>{settings.chipRate ?? 0}</span>
              <Button
                type="button"
                size="small"
                variant="secondary"
                onClick={() => handleChange('chipRate', (settings.chipRate ?? 0) + 10)}
                disabled={disabled}
                style={{ padding: '2px 8px', minWidth: '30px' }}
              >
                +
              </Button>
            </div>
          </div>
        )}

        {/* 符計算 */}
        <Switch
          checked={settings.useFuCalculation}
          onChange={(checked) => handleChange('useFuCalculation', checked)}
          label="符計算あり"
          disabled={disabled}
        />
        {!settings.useFuCalculation && (
          <div className={styles.conditionalSection}>
            <div className={styles.fixedPointTable}>
              <div style={{ fontWeight: 'var(--font-weight-bold)' }}>1〜3翻 固定点</div>
              {NO_FU_FIXED_POINT_HAN_LIST.map((han) => (
                <div key={han} className={styles.fixedPointRow}>
                  <span>{han}翻</span>
                  {(['child', 'dealer'] as const).map((target) => (
                    <div key={target} className={styles.fixedPointCell}>
                      <span className={styles.fixedPointCellLabel}>
                        {target === 'child' ? '子' : '親'}
                      </span>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => handleNoFuFixedPointChange(han, target, -100)}
                        disabled={disabled}
                        style={{ padding: '2px 8px', minWidth: '30px' }}
                      >
                        -
                      </Button>
                      <span className={styles.fixedPointCellValue}>
                        {noFuFixedPoints[han][target]}
                      </span>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => handleNoFuFixedPointChange(han, target, 100)}
                        disabled={disabled}
                        style={{ padding: '2px 8px', minWidth: '30px' }}
                      >
                        +
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
