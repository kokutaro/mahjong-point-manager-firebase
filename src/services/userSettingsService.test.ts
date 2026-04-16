/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserSettings } from '../types';
import {
  getUserSettings,
  saveUserSettings,
  subscribeToUserSettings,
  USER_SETTINGS_COLLECTION,
} from './userSettingsService';

const mocks = vi.hoisted(() => ({
  mockDoc: vi.fn((_db: any, ...pathSegments: string[]) => ({
    id: pathSegments[pathSegments.length - 1],
    path: pathSegments.join('/'),
  })),
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockServerTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('firebase/firestore', () => ({
  doc: mocks.mockDoc,
  getDoc: mocks.mockGetDoc,
  setDoc: mocks.mockSetDoc,
  onSnapshot: mocks.mockOnSnapshot,
  serverTimestamp: mocks.mockServerTimestamp,
}));

vi.mock('./firebase', () => ({
  db: {},
}));

describe('userSettingsService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses the userSettings collection', () => {
    expect(USER_SETTINGS_COLLECTION).toBe('userSettings');
  });

  it('returns null when no user settings document exists', async () => {
    mocks.mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    await expect(getUserSettings('user-1')).resolves.toBeNull();
  });

  it('normalizes partial stored data into full user settings', async () => {
    mocks.mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        displayName: '設定済み表示名',
        defaultCompetitionSettings: {
          rate: 100,
          uma: [5, 10],
        },
      }),
    });

    const result = await getUserSettings('user-1');

    expect(result).toEqual(
      expect.objectContaining({
        displayName: '設定済み表示名',
        avatarPresetId: 'tile-red',
        defaultCompetitionSettings: expect.objectContaining({
          rate: 100,
          uma: [5, 10],
        }),
      }),
    );
  });

  it('writes settings with merge semantics and updated timestamp', async () => {
    const settings: UserSettings = {
      displayName: '保存名',
      avatarPresetId: 'tile-blue',
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
    };

    await saveUserSettings('user-1', settings);

    expect(mocks.mockDoc).toHaveBeenCalledWith(expect.anything(), 'userSettings', 'user-1');
    expect(mocks.mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      expect.objectContaining({
        ...settings,
        updatedAt: 'SERVER_TIMESTAMP',
      }),
      { merge: true },
    );
  });

  it('subscribes to the user settings document and returns normalized data', () => {
    const callback = vi.fn();
    const unsubscribe = vi.fn();

    mocks.mockOnSnapshot.mockImplementation((_ref: any, onNext: any) => {
      onNext({
        exists: () => true,
        data: () => ({
          displayName: '購読済み表示名',
        }),
      });
      return unsubscribe;
    });

    const result = subscribeToUserSettings('user-1', callback);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: '購読済み表示名',
        avatarPresetId: 'tile-red',
      }),
    );
    expect(result).toBe(unsubscribe);
  });
});
