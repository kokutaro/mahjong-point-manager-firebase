// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompetitionNewPage } from './CompetitionNewPage';

const mockNavigate = vi.fn();
const mockShowSnackbar = vi.fn();
const mockCreateCompetition = vi.fn();
const mockAddParticipant = vi.fn();
const mockGenerateId = vi.fn(() => 'comp-1234567890');
const mockHashPasscode = vi.fn();

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

vi.mock('../utils/id', () => ({
  generateId: () => mockGenerateId(),
}));

vi.mock('../utils/hash', () => ({
  hashPasscode: (...args: unknown[]) => mockHashPasscode(...args),
}));

beforeEach(() => {
  mockNavigate.mockReset();
  mockShowSnackbar.mockReset();
  mockCreateCompetition.mockReset();
  mockAddParticipant.mockReset();
  mockHashPasscode.mockReset();
  mockHashPasscode.mockResolvedValue('hashed-passcode');
});

afterEach(() => {
  cleanup();
});

describe('CompetitionNewPage', () => {
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
});
