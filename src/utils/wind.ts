import type { Player } from '../types';
import type { Wind } from '../types/analysis';

export const WIND_LABELS: Record<Wind, string> = {
  East: '東',
  South: '南',
  West: '西',
  North: '北',
};

export const WIND_ORDER: Wind[] = ['East', 'South', 'West', 'North'];

export const rotatePlayerWinds = (players: Player[], isRenchan: boolean): Player[] => {
  if (isRenchan) return players;

  const activeWinds = WIND_ORDER.slice(0, players.length);
  return players.map((player) => {
    const currentWindIndex = activeWinds.indexOf(player.wind);
    if (currentWindIndex === -1) return player;

    const nextWindIndex = (currentWindIndex - 1 + activeWinds.length) % activeWinds.length;
    return { ...player, wind: activeWinds[nextWindIndex] };
  });
};

export const windToKanji = (wind: string): string => {
  return WIND_LABELS[wind as Wind] ?? wind;
};
