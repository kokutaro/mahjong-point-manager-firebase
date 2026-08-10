import {
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type {
  Competition,
  CompetitionParticipant,
  CompetitionSeries,
  CompetitionSeriesMember,
  CompetitionSeriesRound,
} from '../types';
import { generateId } from '../utils/id';
import { auth, db } from './firebase';

export const COMPETITION_SERIES_COLLECTION = 'competitionSeries';

const requireCurrentUserId = (): string => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('認証が必要です');
  return userId;
};

const validateSeriesName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    throw new Error('シリーズ名は1〜50文字で入力してください');
  }
  return trimmed;
};

const validateMemberName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 32) {
    throw new Error('参加者名は1〜32文字で入力してください');
  }
  return trimmed;
};

const isManager = (
  value: Pick<CompetitionSeries, 'organizerId' | 'coOrganizerIds'>,
  userId: string,
): boolean => value.organizerId === userId || value.coOrganizerIds.includes(userId);

export const createCompetitionSeries = async (
  series: Omit<CompetitionSeries, 'createdAt' | 'updatedAt'>,
): Promise<void> => {
  const currentUserId = requireCurrentUserId();
  if (series.organizerId !== currentUserId) throw new Error('主催者IDが一致しません');
  if (series.startDate && series.endDate && series.startDate > series.endDate) {
    throw new Error('終了日は開始日以降にしてください');
  }

  await setDoc(doc(db, COMPETITION_SERIES_COLLECTION, series.id), {
    ...series,
    name: validateSeriesName(series.name),
    description: series.description?.trim() ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToCompetitionSeries = (
  seriesId: string,
  callback: (series: CompetitionSeries | null) => void,
) =>
  onSnapshot(
    doc(db, COMPETITION_SERIES_COLLECTION, seriesId),
    (snapshot) => callback(snapshot.exists() ? (snapshot.data() as CompetitionSeries) : null),
    () => callback(null),
  );

export const getUserCompetitionSeries = async (userId: string): Promise<CompetitionSeries[]> => {
  const organizerQuery = query(
    collection(db, COMPETITION_SERIES_COLLECTION),
    where('organizerId', '==', userId),
  );
  const snapshot = await getDocs(organizerQuery);
  return snapshot.docs.map((item) => item.data() as CompetitionSeries);
};

export const updateCompetitionSeries = async (
  seriesId: string,
  updates: Partial<CompetitionSeries>,
): Promise<void> => {
  const safeUpdates = { ...updates };
  if (safeUpdates.name !== undefined) safeUpdates.name = validateSeriesName(safeUpdates.name);
  if (safeUpdates.description !== undefined)
    safeUpdates.description = safeUpdates.description.trim();
  await updateDoc(doc(db, COMPETITION_SERIES_COLLECTION, seriesId), {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });
};

export const addCompetitionSeriesMember = async (
  seriesId: string,
  member: Omit<CompetitionSeriesMember, 'joinedAt'>,
): Promise<void> => {
  await setDoc(doc(db, COMPETITION_SERIES_COLLECTION, seriesId, 'members', member.id), {
    ...member,
    name: validateMemberName(member.name),
    notes: member.notes?.trim() ?? '',
    joinedAt: serverTimestamp(),
  });
};

export const updateCompetitionSeriesMember = async (
  seriesId: string,
  memberId: string,
  updates: Partial<CompetitionSeriesMember>,
): Promise<void> => {
  const safeUpdates = { ...updates };
  if (safeUpdates.name !== undefined) safeUpdates.name = validateMemberName(safeUpdates.name);
  if (safeUpdates.notes !== undefined) safeUpdates.notes = safeUpdates.notes.trim();
  await updateDoc(
    doc(db, COMPETITION_SERIES_COLLECTION, seriesId, 'members', memberId),
    safeUpdates,
  );
};

export const subscribeToCompetitionSeriesMembers = (
  seriesId: string,
  callback: (members: CompetitionSeriesMember[]) => void,
) =>
  onSnapshot(
    collection(db, COMPETITION_SERIES_COLLECTION, seriesId, 'members'),
    (snapshot) => callback(snapshot.docs.map((item) => item.data() as CompetitionSeriesMember)),
    () => callback([]),
  );

export const subscribeToCompetitionSeriesRounds = (
  seriesId: string,
  callback: (rounds: CompetitionSeriesRound[]) => void,
) =>
  onSnapshot(
    collection(db, COMPETITION_SERIES_COLLECTION, seriesId, 'rounds'),
    (snapshot) =>
      callback(
        snapshot.docs
          .map((item) => item.data() as CompetitionSeriesRound)
          .sort((a, b) => a.roundNumber - b.roundNumber),
      ),
    () => callback([]),
  );

export const linkCompetitionToSeries = async (
  seriesId: string,
  competitionId: string,
  roundNumber: number,
): Promise<void> => {
  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    throw new Error('回番号は1以上の整数で入力してください');
  }

  const currentUserId = requireCurrentUserId();
  const seriesRef = doc(db, COMPETITION_SERIES_COLLECTION, seriesId);
  const competitionRef = doc(db, 'competitions', competitionId);
  const roundRef = doc(db, COMPETITION_SERIES_COLLECTION, seriesId, 'rounds', String(roundNumber));

  await runTransaction(db, async (transaction) => {
    const [seriesSnapshot, competitionSnapshot, roundSnapshot] = await Promise.all([
      transaction.get(seriesRef),
      transaction.get(competitionRef),
      transaction.get(roundRef),
    ]);
    if (!seriesSnapshot.exists()) throw new Error('大会シリーズが見つかりません');
    if (!competitionSnapshot.exists()) throw new Error('大会が見つかりません');

    const series = seriesSnapshot.data() as CompetitionSeries;
    const competition = competitionSnapshot.data() as Competition;
    if (!isManager(series, currentUserId) || competition.organizerId !== currentUserId) {
      throw new Error('この大会をシリーズへ紐付ける権限がありません');
    }
    if (roundSnapshot.exists()) throw new Error('この回番号はすでに使用されています');
    if (competition.seriesId) {
      throw new Error(
        competition.seriesId === seriesId
          ? 'この大会はすでにシリーズへ紐付いています'
          : 'この大会は別のシリーズに紐付いています',
      );
    }

    transaction.set(roundRef, {
      id: String(roundNumber),
      competitionId,
      roundNumber,
      linkedAt: serverTimestamp(),
    });
    transaction.update(competitionRef, { seriesId, seriesRoundNumber: roundNumber });
  });
};

export const unlinkCompetitionFromSeries = async (
  seriesId: string,
  competitionId: string,
  roundNumber: number,
): Promise<void> => {
  const currentUserId = requireCurrentUserId();
  const seriesRef = doc(db, COMPETITION_SERIES_COLLECTION, seriesId);
  const competitionRef = doc(db, 'competitions', competitionId);
  const roundRef = doc(db, COMPETITION_SERIES_COLLECTION, seriesId, 'rounds', String(roundNumber));

  await runTransaction(db, async (transaction) => {
    const [seriesSnapshot, competitionSnapshot, roundSnapshot] = await Promise.all([
      transaction.get(seriesRef),
      transaction.get(competitionRef),
      transaction.get(roundRef),
    ]);
    if (!seriesSnapshot.exists() || !competitionSnapshot.exists() || !roundSnapshot.exists()) {
      throw new Error('紐付けが見つかりません');
    }
    const series = seriesSnapshot.data() as CompetitionSeries;
    const competition = competitionSnapshot.data() as Competition;
    if (!isManager(series, currentUserId) || competition.organizerId !== currentUserId) {
      throw new Error('この紐付けを解除する権限がありません');
    }
    if (competition.seriesId !== seriesId || competition.seriesRoundNumber !== roundNumber) {
      throw new Error('大会と開催回の紐付けが一致しません');
    }

    transaction.delete(roundRef);
    transaction.update(competitionRef, {
      seriesId: deleteField(),
      seriesRoundNumber: deleteField(),
    });
  });
};

export const addSeriesMembersToCompetition = async (
  competitionId: string,
  members: CompetitionSeriesMember[],
): Promise<void> => {
  if (members.length === 0) return;
  const batch = writeBatch(db);
  for (const member of members) {
    if (!member.active) throw new Error('無効なシリーズ参加者は開催回へ追加できません');
    const participantId = `${member.id}-${generateId()}`;
    batch.set(doc(db, 'competitions', competitionId, 'participants', participantId), {
      id: participantId,
      ...(member.userId ? { userId: member.userId } : {}),
      name: validateMemberName(member.name),
      isGuest: !member.userId,
      status: 'idle',
      role: 'player',
      seriesMemberId: member.id,
      joinedAt: serverTimestamp(),
    });
  }
  await batch.commit();
};

export const linkCompetitionParticipantToSeriesMember = async (
  competitionId: string,
  participantId: string,
  seriesMemberId: string | null,
  participantIds: string[],
): Promise<void> => {
  if (!participantIds.includes(participantId)) throw new Error('参加者が見つかりません');
  const refs = participantIds.map((id) =>
    doc(db, 'competitions', competitionId, 'participants', id),
  );
  await runTransaction(db, async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const targetIndex = participantIds.indexOf(participantId);
    if (!snapshots[targetIndex]?.exists()) throw new Error('参加者が見つかりません');

    if (seriesMemberId) {
      const duplicate = snapshots.some((snapshot, index) => {
        if (index === targetIndex || !snapshot.exists()) return false;
        return (snapshot.data() as CompetitionParticipant).seriesMemberId === seriesMemberId;
      });
      if (duplicate) {
        throw new Error('同じシリーズ参加者には複数の参加者を紐付けできません');
      }
    }

    transaction.update(refs[targetIndex], {
      seriesMemberId: seriesMemberId ?? deleteField(),
    });
  });
};
