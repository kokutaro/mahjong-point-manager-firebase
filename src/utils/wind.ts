import type { Wind } from '../types/analysis';

export const WIND_LABELS: Record<Wind, string> = {
  East: '東',
  South: '南',
  West: '西',
  North: '北',
};

export const WIND_ORDER: Wind[] = ['East', 'South', 'West', 'North'];

export const windToKanji = (wind: string): string => {
  return WIND_LABELS[wind as Wind] ?? wind;
};
