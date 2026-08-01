// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScoreAnimation } from '../../hooks/useScoreAnimation';
import type { CompetitionTable, RoomState } from '../../types';
import { LiveTableTile } from './LiveTableTile';

vi.mock('../../hooks/useScoreAnimation', () => ({
  useScoreAnimation: vi.fn(),
}));

const mockedUseScoreAnimation = vi.mocked(useScoreAnimation);

const table: CompetitionTable = {
  id: 'table-1',
  name: 'A卓',
  mode: '4ma',
  status: 'playing',
  playerIds: ['player-1', 'player-2'],
  gameCount: 1,
  createdAt: 1,
  currentRoomId: 'room-1',
};

const room: RoomState = {
  id: 'room-1',
  hostId: 'player-1',
  status: 'playing',
  round: {
    wind: 'East',
    number: 1,
    honba: 0,
    riichiSticks: 1,
  },
  players: [
    {
      id: 'player-1',
      name: '山田',
      score: 27000,
      isRiichi: true,
      wind: 'East',
      chip: 0,
    },
    {
      id: 'player-2',
      name: '佐藤',
      score: 23000,
      isRiichi: false,
      wind: 'South',
      chip: 0,
    },
  ],
  playerIds: ['player-1', 'player-2'],
  settings: {
    mode: '4ma',
    length: 'Hanchan',
    startPoint: 25000,
    returnPoint: 30000,
    uma: [10, 20],
    hasHonba: true,
    honbaPoints: 300,
    tenpaiRenchan: true,
    useTobi: true,
    useChip: false,
    useOka: true,
    useFuCalculation: true,
    westExtension: false,
    rate: 50,
  },
  lastEvent: {
    id: 'event-1',
    type: 'score_change',
    deltas: {
      'player-1': { hand: 3000, sticks: -1000 },
      'player-2': { hand: -2000, sticks: 0 },
    },
  },
};

describe('LiveTableTile', () => {
  beforeEach(() => {
    mockedUseScoreAnimation.mockImplementation(({ playerId, score }) => ({
      displayScore: score,
      delta:
        playerId === 'player-1' ? { value: 3000, type: 'hand' } : { value: -2000, type: 'hand' },
      isAnimating: playerId === 'player-1',
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses the match score animation for every live player', () => {
    render(<LiveTableTile table={table} room={room} participants={[]} />);

    expect(mockedUseScoreAnimation).toHaveBeenCalledWith({
      playerId: 'player-1',
      score: 27000,
      lastEvent: room.lastEvent,
    });
    expect(mockedUseScoreAnimation).toHaveBeenCalledWith({
      playerId: 'player-2',
      score: 23000,
      lastEvent: room.lastEvent,
    });
    expect(screen.getByText('+3,000')).not.toBeNull();
    expect(screen.getByText('-2,000')).not.toBeNull();
    expect(screen.getByText('27,000')).not.toBeNull();
  });

  it('identifies the player who is currently in riichi', () => {
    render(<LiveTableTile table={table} room={room} participants={[]} />);

    expect(screen.getByLabelText('山田はリーチ中')).not.toBeNull();
    expect(screen.getByText('リーチ')).not.toBeNull();
    expect(screen.queryByLabelText('佐藤はリーチ中')).toBeNull();
  });
});
