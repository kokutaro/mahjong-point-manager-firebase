// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserSettings } from '../types';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import { UserSettingsPage } from './UserSettingsPage';

const mockSaveUserSettings = vi.fn();
const mockSetUserSettings = vi.fn();
let mockedUserSettings: UserSettings;

const createUserSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  displayName: '設定済み表示名',
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

vi.mock('../hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    userSettings: mockedUserSettings,
    loading: false,
    saving: false,
    setUserSettings: mockSetUserSettings,
    saveUserSettings: mockSaveUserSettings,
    uid: 'user-1',
  }),
}));

describe('UserSettingsPage', () => {
  beforeEach(() => {
    mockSaveUserSettings.mockReset();
    mockSetUserSettings.mockReset();
    mockedUserSettings = createUserSettings();
  });

  afterEach(() => {
    cleanup();
  });

  it('saves edited display name and avatar preset', async () => {
    render(
      <BrowserRouter>
        <SnackbarProvider>
          <UserSettingsPage />
        </SnackbarProvider>
      </BrowserRouter>,
    );

    fireEvent.change(screen.getByLabelText('表示名'), {
      target: { value: '更新後表示名' },
    });
    fireEvent.click(screen.getByRole('button', { name: '青牌' }));
    fireEvent.click(screen.getByRole('button', { name: '設定を保存' }));

    await waitFor(() => {
      expect(mockSaveUserSettings).toHaveBeenCalledTimes(1);
    });

    expect(mockSaveUserSettings.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        displayName: '更新後表示名',
        avatarPresetId: 'tile-blue',
      }),
    );
  });
});
