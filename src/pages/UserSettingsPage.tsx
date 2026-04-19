import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CompetitionRuleSettings } from '../components/features/CompetitionRuleSettings';
import { RoomRuleSettings } from '../components/features/RoomRuleSettings';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useUserSettings } from '../hooks/useUserSettings';
import type { UserSettings } from '../types';
import { AVATAR_PRESET_OPTIONS } from '../utils/userSettings';
import styles from './UserSettingsPage.module.css';

export const UserSettingsPage = () => {
  const { showSnackbar } = useSnackbar();
  const { userSettings, loading, saving, saveUserSettings, sessionKey } = useUserSettings();
  const [draftOverride, setDraftOverride] = useState<{
    sessionKey: string | null;
    value: UserSettings;
  } | null>(null);
  const draftSettings =
    draftOverride && draftOverride.sessionKey === sessionKey ? draftOverride.value : userSettings;

  const handleSave = async () => {
    const normalizedDisplayName = draftSettings.displayName.trim();
    if (!normalizedDisplayName) {
      showSnackbar('表示名を入力してください', { position: 'top' });
      return;
    }

    try {
      await saveUserSettings({
        ...draftSettings,
        displayName: normalizedDisplayName,
      });
      setDraftOverride(null);
      showSnackbar('設定を保存しました');
    } catch {
      showSnackbar('設定の保存に失敗しました', { position: 'top' });
    }
  };

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.backLink}>
        ← トップに戻る
      </Link>

      <div>
        <h1>ユーザー設定</h1>
        <p className={styles.helperText}>表示名や作成時のデフォルト設定を保存できます。</p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>基本設定</h2>

        <div className={styles.fieldGroup}>
          <label htmlFor="display-name">表示名</label>
          <Input
            id="display-name"
            aria-label="表示名"
            value={draftSettings.displayName}
            onChange={(event) =>
              setDraftOverride((current) => ({
                sessionKey,
                value: {
                  ...(current && current.sessionKey === sessionKey ? current.value : draftSettings),
                  displayName: event.target.value,
                },
              }))
            }
            placeholder="表示名を入力"
            fullWidth
            disabled={loading || saving}
          />
        </div>

        <div className={styles.fieldGroup}>
          <span>アバター</span>
          <div className={styles.avatarRow}>
            {AVATAR_PRESET_OPTIONS.map((avatarOption) => (
              <Button
                key={avatarOption.id}
                type="button"
                variant={draftSettings.avatarPresetId === avatarOption.id ? 'primary' : 'secondary'}
                onClick={() =>
                  setDraftOverride((current) => ({
                    sessionKey,
                    value: {
                      ...(current && current.sessionKey === sessionKey
                        ? current.value
                        : draftSettings),
                      avatarPresetId: avatarOption.id,
                    },
                  }))
                }
                disabled={loading || saving}
              >
                {avatarOption.label}
              </Button>
            ))}
          </div>
          <p className={styles.helperText}>
            アバターはこの画面で保存のみ行い、他画面への反映はまだ行いません。
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>部屋作成デフォルト</h2>
        <RoomRuleSettings
          settings={draftSettings.defaultRoomSettings}
          onChange={(nextSettings) =>
            setDraftOverride((current) => ({
              sessionKey,
              value: {
                ...(current && current.sessionKey === sessionKey ? current.value : draftSettings),
                defaultRoomSettings: nextSettings,
              },
            }))
          }
          disabled={loading || saving}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>大会作成デフォルト</h2>
        <CompetitionRuleSettings
          settings={draftSettings.defaultCompetitionSettings}
          onChange={(nextSettings) =>
            setDraftOverride((current) => ({
              sessionKey,
              value: {
                ...(current && current.sessionKey === sessionKey ? current.value : draftSettings),
                defaultCompetitionSettings: nextSettings,
              },
            }))
          }
          disabled={loading || saving}
        />
      </section>

      <div className={styles.actions}>
        <Button type="button" onClick={handleSave} disabled={loading || saving}>
          {saving ? '保存中...' : '設定を保存'}
        </Button>
      </div>
    </div>
  );
};
