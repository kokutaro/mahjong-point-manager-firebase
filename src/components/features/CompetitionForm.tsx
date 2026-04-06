import React, { useState } from 'react';
import type { CompetitionSettings } from '../../types';
import { DEFAULT_COMPETITION_SETTINGS } from '../../utils/competitionDefaults';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import styles from './CompetitionForm.module.css';
import { CompetitionRuleSettings } from './CompetitionRuleSettings';

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

      <CompetitionRuleSettings settings={settings} onChange={setSettings} />

      <Button type="submit" variant="primary" fullWidth disabled={!name.trim() || loading}>
        {loading ? '作成中...' : '大会を作成'}
      </Button>
    </form>
  );
};
