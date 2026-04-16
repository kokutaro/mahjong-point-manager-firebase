// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserSettings } from '../types';
import { CompetitionNewPage } from './CompetitionNewPage';

const mockNavigate = vi.fn();
const mockShowSnackbar = vi.fn();
const mockCreateCompetition = vi.fn();
const mockAddParticipant = vi.fn();
const mockGenerateId = vi.fn(() => 'comp-1234567890');
const mockHashPasscode = vi.fn();
const mockUseUserSettings = vi.fn();

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

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

vi.mock('../services/competitionService', () => ({
  createCompetition: (...args: unknown[]) => mockCreateCompetition(...args),
  addParticipant: (...args: unknown[]) => mockAddParticipant(...args),
}));

vi.mock('../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user-1',
      isAnonymous: false,
    },
  },
}));

vi.mock('../hooks/useUserSettings', () => ({
  useUserSettings: () => mockUseUserSettings(),
}));

vi.mock('../utils/id', () => ({
  generateId: () => mockGenerateId(),
}));

vi.mock('../utils/hash', () => ({
  hashPasscode: (...args: unknown[]) => mockHashPasscode(...args),
}));

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockReset();
  mockShowSnackbar.mockReset();
  mockCreateCompetition.mockReset();
  mockAddParticipant.mockReset();
  mockHashPasscode.mockReset();
  mockHashPasscode.mockResolvedValue('hashed-passcode');
  mockUseUserSettings.mockReturnValue({
    userSettings: createUserSettings(),
    loading: false,
    saving: false,
    setUserSettings: vi.fn(),
    saveUserSettings: vi.fn(),
    uid: 'user-1',
  });
});

afterEach(() => {
  cleanup();
});

describe('CompetitionNewPage', () => {
  it('passes organizer display name to addParticipant and syncs localStorage', async () => {
    render(<CompetitionNewPage />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.change(screen.getByLabelText('主催者表示名'), {
      target: { value: '大会ホスト' },
    });

    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    await waitFor(() => {
      expect(mockCreateCompetition).toHaveBeenCalledTimes(1);
    });

    expect(mockAddParticipant).toHaveBeenCalledWith(
      'comp-1234567890',
      expect.objectContaining({
        name: '大会ホスト',
      }),
    );
    expect(localStorage.getItem('mahjong_player_name')).toBe('大会ホスト');
  });

  it('auto-adds organizer as participant when auto join switch is on', async () => {
    render(<CompetitionNewPage />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });

    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    await waitFor(() => {
      expect(mockCreateCompetition).toHaveBeenCalledTimes(1);
    });

    expect(mockAddParticipant).toHaveBeenCalledTimes(1);
    expect(mockAddParticipant).toHaveBeenCalledWith(
      'comp-1234567890',
      expect.objectContaining({
        id: 'user-1',
        userId: 'user-1',
        name: '主催者名',
        role: 'organizer',
        status: 'idle',
        isGuest: false,
      }),
    );

    expect(mockNavigate).toHaveBeenCalledWith('/competitions/comp-1234567890');
  });

  it('does not auto-add organizer when auto join switch is off', async () => {
    render(<CompetitionNewPage />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.click(screen.getByLabelText('大会に参加する'));

    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    await waitFor(() => {
      expect(mockCreateCompetition).toHaveBeenCalledTimes(1);
    });

    expect(mockAddParticipant).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/competitions/comp-1234567890');
  });

  it('uses localStorage name as initial organizer display name', async () => {
    localStorage.setItem('mahjong_player_name', '保存済みプレイヤー名');
    mockUseUserSettings.mockReturnValue({
      userSettings: createUserSettings({ displayName: '保存済みプレイヤー名' }),
      loading: false,
      saving: false,
      setUserSettings: vi.fn(),
      saveUserSettings: vi.fn(),
      uid: 'user-1',
    });

    render(<CompetitionNewPage />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });

    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    await waitFor(() => {
      expect(mockCreateCompetition).toHaveBeenCalledTimes(1);
    });

    expect(mockAddParticipant).toHaveBeenCalledWith(
      'comp-1234567890',
      expect.objectContaining({
        name: '保存済みプレイヤー名',
      }),
    );
  });

  it('prefers user settings display name and competition defaults over localStorage fallback', async () => {
    localStorage.setItem('mahjong_player_name', 'ローカル保存名');
    const remoteSettings = createUserSettings({
      displayName: 'Firestore表示名',
      defaultCompetitionSettings: {
        ...createUserSettings().defaultCompetitionSettings,
        rate: 100,
        uma: [5, 10],
      },
    });
    mockUseUserSettings.mockReturnValue({
      userSettings: remoteSettings,
      loading: false,
      saving: false,
      setUserSettings: vi.fn(),
      saveUserSettings: vi.fn(),
      uid: 'user-1',
    });

    render(<CompetitionNewPage />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    await waitFor(() => {
      expect(mockCreateCompetition).toHaveBeenCalledTimes(1);
    });

    expect(mockAddParticipant).toHaveBeenCalledWith(
      'comp-1234567890',
      expect.objectContaining({
        name: 'Firestore表示名',
      }),
    );
    expect(mockCreateCompetition.mock.calls[0][0].settings).toEqual(
      expect.objectContaining({
        rate: 100,
        uma: [5, 10],
      }),
    );
  });

  it('prevents create when organizer display name is whitespace only', async () => {
    render(<CompetitionNewPage />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.change(screen.getByLabelText('主催者表示名'), {
      target: { value: '   ' },
    });

    const submitButton = screen.getByRole('button', { name: '大会を作成' });
    expect(submitButton.getAttribute('disabled')).not.toBeNull();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowSnackbar).not.toHaveBeenCalled();
    });
    expect(mockCreateCompetition).not.toHaveBeenCalled();
    expect(mockAddParticipant).not.toHaveBeenCalled();
  });
});
