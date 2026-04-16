import type { AvatarPresetId, UserSettings, UserSettingsDocument } from '../types';
import { normalizeCompetitionSettings } from './competitionDefaults';
import { normalizeRoomDefaultSettings } from './roomDefaults';

export const PLAYER_NAME_STORAGE_KEY = 'mahjong_player_name';
export const DEFAULT_AVATAR_PRESET_ID: AvatarPresetId = 'tile-red';

export const AVATAR_PRESET_OPTIONS: Array<{ id: AvatarPresetId; label: string }> = [
  { id: 'tile-red', label: '赤牌' },
  { id: 'tile-blue', label: '青牌' },
  { id: 'tile-green', label: '緑牌' },
];

export const readStoredPlayerName = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || '';
};

export const writeStoredPlayerName = (displayName: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedDisplayName = displayName.trim();
  if (normalizedDisplayName) {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, normalizedDisplayName);
    return;
  }

  localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
};

export const normalizeUserSettings = (
  settings?: UserSettingsDocument | Partial<UserSettings> | null,
): UserSettings => {
  const nextSettings = settings ?? null;

  return {
    displayName: nextSettings?.displayName?.trim() || readStoredPlayerName(),
    avatarPresetId: nextSettings?.avatarPresetId ?? DEFAULT_AVATAR_PRESET_ID,
    defaultRoomSettings: normalizeRoomDefaultSettings(nextSettings?.defaultRoomSettings),
    defaultCompetitionSettings: normalizeCompetitionSettings(
      nextSettings?.defaultCompetitionSettings,
    ),
    ...(nextSettings?.createdAt !== undefined ? { createdAt: nextSettings.createdAt } : {}),
    ...(nextSettings?.updatedAt !== undefined ? { updatedAt: nextSettings.updatedAt } : {}),
  };
};

export const createDefaultUserSettings = (): UserSettings => normalizeUserSettings(null);
