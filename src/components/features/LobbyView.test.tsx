// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoomState } from '../../types';
import { LobbyView } from './LobbyView';

afterEach(() => {
  cleanup();
});

const createRoomState = (): RoomState => ({
  id: 'ROOM01',
  hostId: 'user-1',
  roomName: 'テスト卓',
  status: 'waiting',
  round: {
    wind: 'East',
    number: 1,
    honba: 0,
    riichiSticks: 0,
  },
  players: [
    {
      id: 'user-1',
      name: 'テストユーザー',
      score: 25000,
      isRiichi: false,
      wind: 'East',
      chip: 0,
    },
  ],
  playerIds: ['user-1'],
  settings: {
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
});

describe('LobbyView', () => {
  it('opens the QR modal from the waiting room', () => {
    render(
      <LobbyView
        room={createRoomState()}
        currentUserId="user-1"
        onReorder={vi.fn()}
        onStartGame={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'QRコードを表示' }));

    expect(screen.getByText('ルームへのリンク')).not.toBeNull();
    expect(screen.getByText(window.location.href)).not.toBeNull();
  });
});
