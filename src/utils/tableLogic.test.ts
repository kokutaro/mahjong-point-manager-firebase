import { describe, expect, it } from 'vitest';
import type { SeatAssignment } from '../types';
import {
  assignDefaultSeats,
  computeTableStatus,
  getAvailableSeats,
  getTableCapacity,
  randomizeSeats,
} from './tableLogic';

describe('tableLogic', () => {
  describe('getTableCapacity', () => {
    it('should return 3 for 3ma', () => {
      expect(getTableCapacity('3ma')).toBe(3);
    });

    it('should return 4 for 4ma', () => {
      expect(getTableCapacity('4ma')).toBe(4);
    });
  });

  describe('computeTableStatus', () => {
    it('should return "open" when playerCount < capacity', () => {
      expect(computeTableStatus(0, 4)).toBe('open');
      expect(computeTableStatus(2, 4)).toBe('open');
      expect(computeTableStatus(3, 4)).toBe('open');
    });

    it('should return "ready" when playerCount >= capacity (4ma)', () => {
      expect(computeTableStatus(4, 4)).toBe('ready');
    });

    it('should return "ready" when playerCount >= capacity (3ma)', () => {
      expect(computeTableStatus(3, 3)).toBe('ready');
    });
  });

  describe('assignDefaultSeats', () => {
    it('should assign East, South, West, North in order for 4ma with 4 players', () => {
      const result = assignDefaultSeats(['p1', 'p2', 'p3', 'p4'], '4ma');
      expect(result).toEqual({
        p1: 'East',
        p2: 'South',
        p3: 'West',
        p4: 'North',
      });
    });

    it('should assign East, South, West in order for 3ma with 3 players', () => {
      const result = assignDefaultSeats(['p1', 'p2', 'p3'], '3ma');
      expect(result).toEqual({
        p1: 'East',
        p2: 'South',
        p3: 'West',
      });
    });

    it('should assign only available seats for fewer players (2 in 4ma)', () => {
      const result = assignDefaultSeats(['p1', 'p2'], '4ma');
      expect(result).toEqual({
        p1: 'East',
        p2: 'South',
      });
    });

    it('should return empty assignment for empty players', () => {
      const result = assignDefaultSeats([], '4ma');
      expect(result).toEqual({});
    });
  });

  describe('randomizeSeats', () => {
    it('should assign all players to seats for 4ma', () => {
      const result = randomizeSeats(['p1', 'p2', 'p3', 'p4'], '4ma');
      const playerIds = Object.keys(result);
      const seats = Object.values(result);

      expect(playerIds).toHaveLength(4);
      expect(new Set(seats).size).toBe(4);
      expect(seats.every((s) => ['East', 'South', 'West', 'North'].includes(s))).toBe(true);
    });

    it('should assign all players to seats for 3ma', () => {
      const result = randomizeSeats(['p1', 'p2', 'p3'], '3ma');
      const playerIds = Object.keys(result);
      const seats = Object.values(result);

      expect(playerIds).toHaveLength(3);
      expect(new Set(seats).size).toBe(3);
      expect(seats.every((s) => ['East', 'South', 'West'].includes(s))).toBe(true);
    });

    it('should assign only available seats for fewer players', () => {
      const result = randomizeSeats(['p1', 'p2'], '4ma');
      const playerIds = Object.keys(result);
      const seats = Object.values(result);

      expect(playerIds).toHaveLength(2);
      expect(new Set(seats).size).toBe(2);
      expect(seats.every((s) => ['East', 'South', 'West', 'North'].includes(s))).toBe(true);
    });

    it('should return empty assignment for empty players', () => {
      const result = randomizeSeats([], '4ma');
      expect(result).toEqual({});
    });
  });

  describe('getAvailableSeats', () => {
    it('should return remaining seats for partially filled 4ma table', () => {
      const assignment: SeatAssignment = { p1: 'East', p2: 'South' };
      const result = getAvailableSeats(assignment, '4ma');
      expect(result).toEqual(['West', 'North']);
    });

    it('should return all seats when no one is assigned', () => {
      const result = getAvailableSeats(undefined, '4ma');
      expect(result).toEqual(['East', 'South', 'West', 'North']);
    });

    it('should return all seats for empty assignment object', () => {
      const result = getAvailableSeats({}, '3ma');
      expect(result).toEqual(['East', 'South', 'West']);
    });

    it('should return empty array when table is full', () => {
      const assignment: SeatAssignment = { p1: 'East', p2: 'South', p3: 'West', p4: 'North' };
      const result = getAvailableSeats(assignment, '4ma');
      expect(result).toEqual([]);
    });
  });
});
