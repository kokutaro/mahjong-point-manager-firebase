import type { SeatAssignment } from '../types';

const SEATS_4MA = ['East', 'South', 'West', 'North'] as const;
const SEATS_3MA = ['East', 'South', 'West'] as const;

export const getTableCapacity = (mode: '3ma' | '4ma'): number => (mode === '3ma' ? 3 : 4);

export const computeTableStatus = (playerCount: number, capacity: number): 'open' | 'ready' =>
  playerCount >= capacity ? 'ready' : 'open';

export const assignDefaultSeats = (playerIds: string[], mode: '3ma' | '4ma'): SeatAssignment => {
  const seats = mode === '3ma' ? SEATS_3MA : SEATS_4MA;
  const assignment: SeatAssignment = {};
  playerIds.forEach((id, i) => {
    if (i < seats.length) assignment[id] = seats[i];
  });
  return assignment;
};

export const randomizeSeats = (playerIds: string[], mode: '3ma' | '4ma'): SeatAssignment => {
  const seats = mode === '3ma' ? [...SEATS_3MA] : [...SEATS_4MA];
  // Fisher-Yates shuffle
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  const assignment: SeatAssignment = {};
  playerIds.forEach((id, i) => {
    if (i < seats.length) assignment[id] = seats[i];
  });
  return assignment;
};

export const getAvailableSeats = (
  seatAssignment: SeatAssignment | undefined,
  mode: '3ma' | '4ma',
): string[] => {
  const allSeats = mode === '3ma' ? [...SEATS_3MA] : [...SEATS_4MA];
  const usedSeats = new Set(Object.values(seatAssignment ?? {}));
  return allSeats.filter((s) => !usedSeats.has(s));
};
