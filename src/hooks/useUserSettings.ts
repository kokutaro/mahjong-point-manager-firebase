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
  userSettings: UserSettings;
  loading: boolean;
  saving: boolean;
  setUserSettings: Dispatch<SetStateAction<UserSettings>>;
  saveUserSettings: (settings: UserSettings) => Promise<void>;
}

export const useUserSettings = (): UseUserSettingsResult => {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [userSettings, setUserSettings] = useState<UserSettings>(() => createDefaultUserSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) {
      setUserSettings(createDefaultUserSettings());
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserSettings(uid, (nextSettings) => {
      setUserSettings(normalizeUserSettings(nextSettings));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

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
    } finally {
      setSaving(false);
    }
  };

  return {
    uid,
    userSettings,
    loading,
    saving,
    setUserSettings,
    saveUserSettings,
  };
};
