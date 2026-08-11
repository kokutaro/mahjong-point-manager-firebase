// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompetitionSeries, CompetitionSeriesMember } from '../types';
import { CompetitionSeriesJoinPage } from './CompetitionSeriesJoinPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  showSnackbar: vi.fn(),
  joinSeries: vi.fn(),
  getMemberByUserId: vi.fn(),
}));

const series: CompetitionSeries = {
  id: 'series-1',
  name: '年間リーグ',
  description: '毎月開催',
  organizerId: 'organizer',
  coOrganizerIds: [],
  createdAt: 1,
  updatedAt: 1,
};

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ seriesId: 'series-1' }),
}));
vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ currentUser: { uid: 'player-1', isAnonymous: true } }),
}));
vi.mock('../contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: mocks.showSnackbar }),
}));
vi.mock('../services/competitionSeriesService', () => ({
  getCompetitionSeriesMemberByUserId: mocks.getMemberByUserId,
  joinCompetitionSeries: mocks.joinSeries,
  subscribeToCompetitionSeries: (
    _seriesId: string,
    callback: (value: CompetitionSeries | null) => void,
  ) => {
    callback(series);
    return vi.fn();
  },
}));

describe('CompetitionSeriesJoinPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.getMemberByUserId.mockResolvedValue(null);
    mocks.joinSeries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('joins the series from the shared link and keeps the display name', async () => {
    render(<CompetitionSeriesJoinPage />);

    expect(screen.getByRole('heading', { name: '年間リーグ' })).not.toBeNull();
    fireEvent.change(screen.getByLabelText('あなたの名前'), {
      target: { value: ' リンク参加者 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '大会シリーズに参加する' }));

    await waitFor(() => expect(mocks.joinSeries).toHaveBeenCalledWith('series-1', 'リンク参加者'));
    expect(localStorage.getItem('mahjong_player_name')).toBe('リンク参加者');
    expect(mocks.navigate).toHaveBeenCalledWith('/competition-series/series-1');
  });

  it('does not create a duplicate when the user is already a series member', async () => {
    mocks.getMemberByUserId.mockResolvedValue({
      id: 'member-existing',
      userId: 'player-1',
      name: '既存参加者',
      active: true,
      joinedAt: 1,
    } satisfies CompetitionSeriesMember);
    render(<CompetitionSeriesJoinPage />);

    fireEvent.change(screen.getByLabelText('あなたの名前'), {
      target: { value: '既存参加者' },
    });
    fireEvent.click(screen.getByRole('button', { name: '大会シリーズに参加する' }));

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/competition-series/series-1'),
    );
    expect(mocks.joinSeries).not.toHaveBeenCalled();
  });
});
