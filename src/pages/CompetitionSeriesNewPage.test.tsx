// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompetitionSeriesNewPage } from './CompetitionSeriesNewPage';

const mocks = vi.hoisted(() => ({
  createSeries: vi.fn(),
  navigate: vi.fn(),
  showSnackbar: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => mocks.navigate,
}));
vi.mock('../contexts/useAuth', () => ({ useAuth: () => ({ uid: 'organizer' }) }));
vi.mock('../contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: mocks.showSnackbar }),
}));
vi.mock('../services/competitionSeriesService', () => ({
  createCompetitionSeries: mocks.createSeries,
}));
vi.mock('../utils/id', () => ({ generateId: () => 'series-new' }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CompetitionSeriesNewPage', () => {
  it('creates a dated series owned by the current user', async () => {
    render(<CompetitionSeriesNewPage />);

    fireEvent.change(screen.getByLabelText('シリーズ名'), { target: { value: ' 年間リーグ ' } });
    fireEvent.change(screen.getByLabelText('説明'), { target: { value: '毎月開催' } });
    fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('終了日'), { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'シリーズを作成' }));

    await waitFor(() =>
      expect(mocks.createSeries).toHaveBeenCalledWith({
        id: 'series-new',
        name: '年間リーグ',
        description: '毎月開催',
        organizerId: 'organizer',
        coOrganizerIds: [],
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith('/competition-series/series-new');
  });
});
