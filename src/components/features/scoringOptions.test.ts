import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCORING_LIMIT_MENU,
  getScoringLimitOptions,
  transitionScoringLimitMenu,
} from './scoringOptions';

describe('getScoringLimitOptions', () => {
  it('returns default limit options with yakuman entry point', () => {
    const options = getScoringLimitOptions('default');

    expect(options.map((option) => option.label)).toEqual([
      '満貫',
      '跳満',
      '倍満',
      '三倍満',
      '役満以上',
    ]);
    expect(options.at(-1)).toMatchObject({
      action: 'open-yakuman-menu',
      isRainbow: true,
      variant: 'danger',
    });
  });

  it('returns yakuman options and back action', () => {
    const options = getScoringLimitOptions('yakuman');

    expect(options.map((option) => option.label)).toEqual([
      '役満',
      'W役満',
      'T役満',
      '4倍役満',
      '戻る',
    ]);
    expect(options.slice(0, 4).every((option) => option.isRainbow)).toBe(true);
    expect(options.slice(0, 4).every((option) => option.variant === 'danger')).toBe(true);
    expect(options.at(-1)).toMatchObject({
      action: 'back-to-default',
      isRainbow: false,
      variant: 'secondary',
    });
  });

  it('starts from the default menu state', () => {
    expect(DEFAULT_SCORING_LIMIT_MENU).toBe('default');
  });

  it('opens the yakuman menu from the default menu', () => {
    expect(transitionScoringLimitMenu('default', 'open-yakuman-menu')).toBe('yakuman');
  });

  it('returns to the default menu from the yakuman menu', () => {
    expect(transitionScoringLimitMenu('yakuman', 'back-to-default')).toBe('default');
  });

  it('resets the menu back to default for reopen and step resets', () => {
    expect(transitionScoringLimitMenu('yakuman', 'reset')).toBe('default');
  });
});
