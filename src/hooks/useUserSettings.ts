import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { UserSettings } from '../types';
import { auth } from '../services/firebase';
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
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [authReady, setAuthReady] = useState(false);
  const [authGeneration, setAuthGeneration] = useState(0);
  const [userSettings, setUserSettings] = useState<UserSettings>(() => defaultSettings);
  const [loadedSettingsKey, setLoadedSettingsKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      setAuthGeneration((current) => current + 1);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const activeSettingsKey = authReady && uid ? `${authGeneration}:${uid}` : null;

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
