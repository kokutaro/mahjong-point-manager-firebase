// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import type { UserSettings } from '../../types';
import { AuthModal } from './AuthModal';

const mockCheckUserHasAnonymousHistory = vi.fn();
const mockGetUserSettings = vi.fn();
const mockMigrateUserData = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockLinkWithCredential = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockCredential = vi.fn();

vi.mock('firebase/auth', () => ({
  EmailAuthProvider: {
    credential: (...args: unknown[]) => mockCredential(...args),
  },
  linkWithCredential: (...args: unknown[]) => mockLinkWithCredential(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
}));

vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'anon-user',
    },
  },
}));

vi.mock('../../services/migrationService', () => ({
  checkUserHasAnonymousHistory: (...args: unknown[]) => mockCheckUserHasAnonymousHistory(...args),
  migrateUserData: (...args: unknown[]) => mockMigrateUserData(...args),
}));

vi.mock('../../services/userSettingsService', () => ({
  getUserSettings: (...args: unknown[]) => mockGetUserSettings(...args),
}));

const createUserSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  displayName: '匿名表示名',
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

describe('AuthModal', () => {
  beforeEach(() => {
    mockCheckUserHasAnonymousHistory.mockReset();
    mockGetUserSettings.mockReset();
    mockMigrateUserData.mockReset();
    mockSignInWithEmailAndPassword.mockReset();
    mockLinkWithCredential.mockReset();
    mockSendPasswordResetEmail.mockReset();
    mockCredential.mockReset();
    mockGetUserSettings.mockResolvedValue(createUserSettings());
  });

  afterEach(() => {
    cleanup();
  });

  it('mentions settings in the migration confirmation dialog', async () => {
    mockCheckUserHasAnonymousHistory.mockResolvedValue(true);
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: 'registered-user',
      },
    });

    render(
      <SnackbarProvider>
        <AuthModal isOpen onClose={() => undefined} />
      </SnackbarProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('メールアドレス'), {
      target: { value: 'player@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワード'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'ログイン' })[1]);

    await waitFor(() => {
      expect(mockCheckUserHasAnonymousHistory).toHaveBeenCalledWith('anon-user');
    });

    expect(await screen.findByText(/戦績や設定データ/)).not.toBeNull();
  });

  it('passes prefetched anonymous user settings to migration after login', async () => {
    const prefetchedSettings = createUserSettings({ displayName: '移行前表示名' });
    mockCheckUserHasAnonymousHistory.mockResolvedValue(true);
    mockGetUserSettings.mockResolvedValue(prefetchedSettings);
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: 'registered-user',
      },
    });

    render(
      <SnackbarProvider>
        <AuthModal isOpen onClose={() => undefined} />
      </SnackbarProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('メールアドレス'), {
      target: { value: 'player@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワード'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'ログイン' })[1]);

    await screen.findByText(/戦績や設定データ/);
    fireEvent.click(screen.getByRole('button', { name: 'はい（統合する）' }));

    await waitFor(() => {
      expect(mockMigrateUserData).toHaveBeenCalledWith(
        'anon-user',
        'registered-user',
        prefetchedSettings,
      );
    });
  });
});
