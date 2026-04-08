import type { RoomState } from '../types';

type HistoryRoomStatusSource = Pick<RoomState, 'competitionId' | 'status'>;

export const isReadOnlyFinishedCompetitionRoom = ({
  competitionId,
  status,
}: HistoryRoomStatusSource): boolean => Boolean(competitionId) && status === 'finished';

export const canResumeRoomFromHistory = ({
  competitionId,
  status,
}: HistoryRoomStatusSource): boolean => {
  if (status === 'ended') {
    return false;
  }

  if (isReadOnlyFinishedCompetitionRoom({ competitionId, status })) {
    return false;
  }

  return true;
};
