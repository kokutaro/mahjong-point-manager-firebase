import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '../contexts/useAuth';
import type { UserSettings } from '../types';
import {
  saveUserSettings as persistUserSettings,
  subscribeToUserSettings,
} from '../services/userSettingsService';
import {
  createDefaultUserSettings,
  normalizeUserSettings,
  writeStoredPlayerName,
} from '../utils/userSettings';

interface UseUserSettingsResult {
  uid: string | null;
  sessionKey: string | null;
  userSettings: UserSettings;
  loading: boolean;
  saving: boolean;
  setUserSettings: Dispatch<SetStateAction<UserSettings>>;
  saveUserSettings: (settings: UserSettings) => Promise<void>;
}

export const useUserSettings = (): UseUserSettingsResult => {
  const defaultSettings = createDefaultUserSettings();
  const { authReady, sessionId, uid } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings>(() => defaultSettings);
  const [loadedSettingsKey, setLoadedSettingsKey] = useState<string | null>(uid);
  const [saving, setSaving] = useState(false);

  const activeSettingsKey = authReady && uid ? `${sessionId}:${uid}` : null;

  useEffect(() => {
    if (!uid || !activeSettingsKey) {
      return;
    }

    const unsubscribe = subscribeToUserSettings(uid, (nextSettings) => {
      setUserSettings(normalizeUserSettings(nextSettings));
      setLoadedSettingsKey(activeSettingsKey);
    });

    return () => unsubscribe();
  }, [activeSettingsKey, uid]);

  const loading =
    !authReady || (activeSettingsKey !== null && loadedSettingsKey !== activeSettingsKey);
  const resolvedUserSettings = uid === null ? defaultSettings : userSettings;

  const saveUserSettings = async (settings: UserSettings) => {
    if (!uid) {
      throw new Error('認証されていません');
    }

    const normalizedSettings = normalizeUserSettings(settings);
    setSaving(true);

    try {
      await persistUserSettings(uid, normalizedSettings);
      writeStoredPlayerName(normalizedSettings.displayName);
      setUserSettings(normalizedSettings);
      setLoadedSettingsKey(activeSettingsKey);
    } finally {
      setSaving(false);
    }
  };

  return {
    uid,
    sessionKey: activeSettingsKey,
    userSettings: resolvedUserSettings,
    loading,
    saving,
    setUserSettings,
    saveUserSettings,
  };
};
