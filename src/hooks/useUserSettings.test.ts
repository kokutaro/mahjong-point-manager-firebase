// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserSettings } from '../types';
import { useUserSettings } from './useUserSettings';

const mockSubscribeToUserSettings = vi.fn();
const mockSaveUserSettings = vi.fn();
const mockOnAuthStateChanged = vi.fn();

const createUserSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  displayName: '',
  avatarPresetId: 'tile-red',
  defaultRoomSettings: {
    mode: '4ma',
    length: 'Hanchan',
    startPoint: 25000,
    returnPoint: 30000,
    uma: [5, 10],
    hasHonba: true,
    honbaPoints: 300,
    tenpaiRenchan: true,
    useTobi: true,
    useChip: false,
    chipRate: 0,
    useOka: true,
    isSingleMode: false,
    useFuCalculation: true,
    noFuFixedPoints: {
      1: { child: 1000, dealer: 1500 },
      2: { child: 2000, dealer: 3000 },
      3: { child: 4000, dealer: 6000 },
    },
    westExtension: false,
    rate: 50,
  },
  defaultCompetitionSettings: {
    length: 'Hanchan',
    startPoint4ma: 25000,
    startPoint3ma: 35000,
    returnPoint4ma: 30000,
    returnPoint3ma: 40000,
    uma: [10, 30],
    hasHonba: true,
    honbaPoints: 300,
    tenpaiRenchan: true,
    useTobi: true,
    useChip: false,
    chipRate: 0,
    useOka: true,
    useFuCalculation: true,
    noFuFixedPoints: {
      1: { child: 1000, dealer: 1500 },
      2: { child: 2000, dealer: 3000 },
      3: { child: 4000, dealer: 6000 },
    },
    westExtension: false,
    rate: 0,
  },
  ...overrides,
});

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

vi.mock('../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user-1',
    },
  },
}));

vi.mock('../services/userSettingsService', () => ({
  subscribeToUserSettings: (...args: unknown[]) => mockSubscribeToUserSettings(...args),
  saveUserSettings: (...args: unknown[]) => mockSaveUserSettings(...args),
}));

describe('useUserSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSaveUserSettings.mockReset();
    mockSubscribeToUserSettings.mockReset();
    mockOnAuthStateChanged.mockReset();
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: 'user-1' });
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to localStorage display name when Firestore has no settings', async () => {
    localStorage.setItem('mahjong_player_name', 'ローカル保存名');
    mockSubscribeToUserSettings.mockImplementation((_uid, callback) => {
      callback(null);
      return vi.fn();
    });

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userSettings.displayName).toBe('ローカル保存名');
    expect(result.current.userSettings.defaultRoomSettings.mode).toBe('4ma');
  });

  it('updates from subscribed Firestore settings', async () => {
    mockSubscribeToUserSettings.mockImplementation((_uid, callback) => {
      callback(
        createUserSettings({
          displayName: 'Firestore表示名',
          avatarPresetId: 'tile-blue',
        }),
      );
      return vi.fn();
    });

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.userSettings.displayName).toBe('Firestore表示名');
    });

    expect(result.current.userSettings.avatarPresetId).toBe('tile-blue');
  });

  it('saves settings and syncs display name to localStorage', async () => {
    mockSubscribeToUserSettings.mockImplementation((_uid, callback) => {
      callback(createUserSettings());
      return vi.fn();
    });

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const nextSettings = createUserSettings({
      displayName: '更新後表示名',
      avatarPresetId: 'tile-green',
    });

    await act(async () => {
      await result.current.saveUserSettings(nextSettings);
    });

    expect(mockSaveUserSettings).toHaveBeenCalledWith('user-1', nextSettings);
    expect(localStorage.getItem('mahjong_player_name')).toBe('更新後表示名');
  });
});
