// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CompetitionParticipant } from '../../types';
import { ParticipantList } from './ParticipantList';

afterEach(() => {
  cleanup();
});

const baseParticipant: CompetitionParticipant = {
  id: 'participant-1',
  userId: 'user-1',
  name: '山田太郎',
  isGuest: false,
  status: 'idle',
  role: 'player',
  joinedAt: 1,
};

describe('ParticipantList', () => {
  it('shows organizer name in "名前(主催者)" format', () => {
    render(
      <ParticipantList
        participants={[
          {
            ...baseParticipant,
            role: 'organizer',
            name: '大会ホスト',
          },
        ]}
        isOrganizer={false}
      />,
    );

    expect(screen.queryByText('大会ホスト(主催者)')).not.toBeNull();
  });

  it('keeps non-organizer participant names unchanged', () => {
    render(
      <ParticipantList
        participants={[
          {
            ...baseParticipant,
            role: 'player',
            name: '一般参加者',
          },
        ]}
        isOrganizer={false}
      />,
    );

    expect(screen.queryByText('一般参加者')).not.toBeNull();
    expect(screen.queryByText('一般参加者(主催者)')).toBeNull();
  });
});
