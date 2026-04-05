import React, { useState } from 'react';
import type { CompetitionSettings } from '../../types';
import { DEFAULT_COMPETITION_SETTINGS } from '../../utils/competitionDefaults';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import styles from './CompetitionForm.module.css';

interface CompetitionFormProps {
  onSubmit: (data: {
    name: string;
    description: string;
    hasPasscode: boolean;
    passcode: string;
    settings: CompetitionSettings;
  }) => void;
  loading?: boolean;
}

export const CompetitionForm: React.FC<CompetitionFormProps> = ({ onSubmit, loading = false }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasPasscode, setHasPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [settings, setSettings] = useState<CompetitionSettings>({
    ...DEFAULT_COMPETITION_SETTINGS,
  });

  const [umaPreset, setUmaPreset] = useState<'5-10' | '10-20' | '10-30' | 'custom'>('10-30');

  const handleChange = <K extends keyof CompetitionSettings>(
    key: K,
    value: CompetitionSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const applyUmaPreset = (preset: '5-10' | '10-20' | '10-30' | 'custom') => {
    setUmaPreset(preset);
    if (preset === '5-10') handleChange('uma', [5, 10]);
    else if (preset === '10-20') handleChange('uma', [10, 20]);
    else if (preset === '10-30') handleChange('uma', [10, 30]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, hasPasscode, passcode, settings });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* 大会名 */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>大会名</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 第1回麻雀大会"
          required
          fullWidth
        />
      </div>

      {/* 説明 */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>説明 (任意)</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="大会の説明"
          fullWidth
        />
      </div>

      {/* パスコード */}
      <div className={styles.fieldGroup}>
        <Switch checked={hasPasscode} onChange={setHasPasscode} label="パスコードを設定する" />
        {hasPasscode && (
          <div className={styles.passcodeSection}>
            <Input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="パスコードを入力"
              fullWidth
            />
          </div>
        )}
      </div>

      <hr className={styles.divider} />

      {/* ルール設定 */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>対局形式</label>
        <div className={styles.buttonRow}>
          <Button
            type="button"
            variant={settings.length === 'Hanchan' ? 'primary' : 'secondary'}
            onClick={() => handleChange('length', 'Hanchan')}
            style={{ flex: 1 }}
          >
            半荘
          </Button>
          <Button
            type="button"
            variant={settings.length === 'Tonpu' ? 'primary' : 'secondary'}
            onClick={() => handleChange('length', 'Tonpu')}
            style={{ flex: 1 }}
          >
            東風
          </Button>
        </div>
      </div>

      {/* 原点 */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>配給原点</label>
        <div className={styles.gridRow}>
          <div>
            <span className={styles.subLabel}>4麻</span>
            <Input
              type="number"
              value={settings.startPoint4ma}
              onChange={(e) => handleChange('startPoint4ma', Number(e.target.value))}
              fullWidth
            />
          </div>
          <div>
            <span className={styles.subLabel}>3麻</span>
            <Input
              type="number"
              value={settings.startPoint3ma}
              onChange={(e) => handleChange('startPoint3ma', Number(e.target.value))}
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
              fullWidth
            />
          </div>
          <div>
            <span className={styles.subLabel}>3麻</span>
            <Input
              type="number"
              value={settings.returnPoint3ma}
              onChange={(e) => handleChange('returnPoint3ma', Number(e.target.value))}
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* ウマ */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>ウマ (順位点)</label>
        <div className={styles.presetRow}>
          <Button
            type="button"
            size="small"
            variant={umaPreset === '5-10' ? 'primary' : 'secondary'}
            onClick={() => applyUmaPreset('5-10')}
          >
            ゴットー (5-10)
          </Button>
          <Button
            type="button"
            size="small"
            variant={umaPreset === '10-20' ? 'primary' : 'secondary'}
            onClick={() => applyUmaPreset('10-20')}
          >
            ワンツー (10-20)
          </Button>
          <Button
            type="button"
            size="small"
            variant={umaPreset === '10-30' ? 'primary' : 'secondary'}
            onClick={() => applyUmaPreset('10-30')}
          >
            ワンスリー (10-30)
          </Button>
          <Button
            type="button"
            size="small"
            variant={umaPreset === 'custom' ? 'primary' : 'secondary'}
            onClick={() => applyUmaPreset('custom')}
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
                onChange={(e) => handleChange('uma', [Number(e.target.value), settings.uma[1]])}
                fullWidth
              />
            </div>
            <div>
              <span className={styles.subLabel}>1着/4着</span>
              <Input
                type="number"
                value={settings.uma[1]}
                onChange={(e) => handleChange('uma', [settings.uma[0], Number(e.target.value)])}
                fullWidth
              />
            </div>
          </div>
        )}
      </div>

      <hr className={styles.divider} />

      {/* Switch 設定群 */}
      <div className={styles.switchGroup}>
        <Switch
          checked={settings.tenpaiRenchan}
          onChange={(checked) => handleChange('tenpaiRenchan', checked)}
          label="テンパイ連荘"
        />
        <Switch
          checked={settings.useTobi}
          onChange={(checked) => handleChange('useTobi', checked)}
          label="トビ (ハコ割れ終了)"
        />
        <Switch
          checked={settings.useChip}
          onChange={(checked) => handleChange('useChip', checked)}
          label="チップ"
        />
        <Switch
          checked={settings.useOka}
          onChange={(checked) => handleChange('useOka', checked)}
          label="オカ"
        />
        <Switch
          checked={settings.useFuCalculation}
          onChange={(checked) => handleChange('useFuCalculation', checked)}
          label="符計算あり"
        />
        <Switch
          checked={settings.westExtension}
          onChange={(checked) => handleChange('westExtension', checked)}
          label="西入 (延長)"
        />
      </div>

      <Button type="submit" variant="primary" fullWidth disabled={!name.trim() || loading}>
        {loading ? '作成中...' : '大会を作成'}
      </Button>
    </form>
  );
};
