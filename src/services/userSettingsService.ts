import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { UserSettings } from '../types';
import { sanitizeFirestoreData } from '../utils/gameSettings';
import { normalizeUserSettings } from '../utils/userSettings';
import { db } from './firebase';

export const USER_SETTINGS_COLLECTION = 'userSettings';

export const getUserSettings = async (uid: string): Promise<UserSettings | null> => {
  const settingsRef = doc(db, USER_SETTINGS_COLLECTION, uid);
  const snapshot = await getDoc(settingsRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeUserSettings(snapshot.data());
};

export const saveUserSettings = async (uid: string, settings: UserSettings): Promise<void> => {
  const settingsRef = doc(db, USER_SETTINGS_COLLECTION, uid);

  await setDoc(
    settingsRef,
    {
      ...sanitizeFirestoreData(normalizeUserSettings(settings)),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const subscribeToUserSettings = (
  uid: string,
  callback: (settings: UserSettings | null) => void,
) => {
  const settingsRef = doc(db, USER_SETTINGS_COLLECTION, uid);

  return onSnapshot(
    settingsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeUserSettings(snapshot.data()));
    },
    (error) => {
      console.error('User settings sync error:', error);
      callback(null);
    },
  );
};
