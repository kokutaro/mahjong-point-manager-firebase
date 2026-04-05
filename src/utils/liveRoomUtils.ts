import type { CompetitionTable } from '../types';

/** Extract unique, sorted roomIds from tables that have a currentRoomId. */
export const extractRoomIds = (tables: CompetitionTable[]): string[] => {
  const ids = tables.filter((t) => t.currentRoomId).map((t) => t.currentRoomId as string);
  return [...new Set(ids)].sort();
};

/** Compute which roomIds were added and which were removed. */
export const diffRoomIds = (
  prev: ReadonlySet<string>,
  next: ReadonlySet<string>,
): { added: string[]; removed: string[] } => {
  const added = [...next].filter((id) => !prev.has(id));
  const removed = [...prev].filter((id) => !next.has(id));
  return { added, removed };
};
