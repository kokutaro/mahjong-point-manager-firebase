// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  it('shows an empty state when there are no participants', () => {
    render(
      <ParticipantList participants={[]} competitionStatus="in_progress" isOrganizer={false} />,
    );

    expect(screen.queryByText('参加者がいません')).not.toBeNull();
  });

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
        competitionStatus="recruiting"
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
        competitionStatus="recruiting"
        isOrganizer={false}
      />,
    );

    expect(screen.queryByText('一般参加者')).not.toBeNull();
    expect(screen.queryByText('一般参加者(主催者)')).toBeNull();
  });

  it('allows the organizer to appoint a UID-backed user after the competition starts', () => {
    const onAppointCoOrganizer = vi.fn();
    const participant = {
      ...baseParticipant,
      isGuest: true,
      name: '匿名ユーザー',
    };

    render(
      <ParticipantList
        participants={[participant]}
        currentUserId="organizer-1"
        competitionStatus="in_progress"
        isOrganizer
        onAppointCoOrganizer={onAppointCoOrganizer}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '共同主催者に任命' }));

    expect(onAppointCoOrganizer).toHaveBeenCalledWith(participant);
  });

  it('does not allow appointing a name-only guest without a user ID', () => {
    render(
      <ParticipantList
        participants={[{ ...baseParticipant, userId: undefined, isGuest: true }]}
        currentUserId="organizer-1"
        competitionStatus="in_progress"
        isOrganizer
        onAppointCoOrganizer={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: '共同主催者に任命' })).toBeNull();
  });

  it('does not allow changing co-organizers after the competition is closed', () => {
    render(
      <ParticipantList
        participants={[baseParticipant]}
        currentUserId="organizer-1"
        competitionStatus="closed"
        isOrganizer
        onAppointCoOrganizer={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: '共同主催者に任命' })).toBeNull();
  });

  it('allows the organizer to remove a UID-backed co-organizer while in progress', () => {
    const onRemoveCoOrganizer = vi.fn();
    const participant = {
      ...baseParticipant,
      isGuest: true,
      role: 'co_organizer' as const,
    };

    render(
      <ParticipantList
        participants={[participant]}
        currentUserId="organizer-1"
        competitionStatus="in_progress"
        isOrganizer
        onRemoveCoOrganizer={onRemoveCoOrganizer}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '解除' }));

    expect(onRemoveCoOrganizer).toHaveBeenCalledWith(participant);
  });

  it('sorts participants by role and then join time', () => {
    const { container } = render(
      <ParticipantList
        participants={[
          { ...baseParticipant, id: 'late-player', name: '後の参加者', joinedAt: 3 },
          {
            ...baseParticipant,
            id: 'co-organizer',
            name: '共同主催者',
            role: 'co_organizer',
            joinedAt: 2,
          },
          { ...baseParticipant, id: 'early-player', name: '先の参加者', joinedAt: 1 },
        ]}
        competitionStatus="in_progress"
        isOrganizer={false}
      />,
    );

    const content = container.textContent ?? '';
    expect(content.indexOf('共同主催者')).toBeLessThan(content.indexOf('先の参加者'));
    expect(content.indexOf('先の参加者')).toBeLessThan(content.indexOf('後の参加者'));
  });
});
