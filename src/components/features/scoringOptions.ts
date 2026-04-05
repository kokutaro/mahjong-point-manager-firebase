type ScoringLimitMenu = 'default' | 'yakuman';

type ScoringLimitAction = 'select-score' | 'open-yakuman-menu' | 'back-to-default';

type ScoringLimitStateAction = ScoringLimitAction | 'reset';

type ScoringLimitVariant = 'danger' | 'secondary';

export const DEFAULT_SCORING_LIMIT_MENU: ScoringLimitMenu = 'default';

export interface ScoringLimitOption {
  label: string;
  action: ScoringLimitAction;
  variant: ScoringLimitVariant;
  isRainbow: boolean;
  han?: number;
  fu?: number;
}

const DEFAULT_LIMIT_OPTIONS: ReadonlyArray<ScoringLimitOption> = [
  { label: '満貫', action: 'select-score', variant: 'danger', isRainbow: false, han: 5, fu: 30 },
  { label: '跳満', action: 'select-score', variant: 'danger', isRainbow: false, han: 6, fu: 30 },
  { label: '倍満', action: 'select-score', variant: 'danger', isRainbow: false, han: 8, fu: 30 },
  {
    label: '三倍満',
    action: 'select-score',
    variant: 'danger',
    isRainbow: false,
    han: 11,
    fu: 30,
  },
  {
    label: '役満以上',
    action: 'open-yakuman-menu',
    variant: 'danger',
    isRainbow: true,
  },
];

const YAKUMAN_LIMIT_OPTIONS: ReadonlyArray<ScoringLimitOption> = [
  { label: '役満', action: 'select-score', variant: 'danger', isRainbow: true, han: 13, fu: 30 },
  { label: 'W役満', action: 'select-score', variant: 'danger', isRainbow: true, han: 26, fu: 30 },
  { label: 'T役満', action: 'select-score', variant: 'danger', isRainbow: true, han: 39, fu: 30 },
  { label: '4倍役満', action: 'select-score', variant: 'danger', isRainbow: true, han: 52, fu: 30 },
  { label: '戻る', action: 'back-to-default', variant: 'secondary', isRainbow: false },
];

export const getScoringLimitOptions = (menu: ScoringLimitMenu): ScoringLimitOption[] => {
  const options = menu === 'yakuman' ? YAKUMAN_LIMIT_OPTIONS : DEFAULT_LIMIT_OPTIONS;
  return options.map((option) => ({ ...option }));
};

export const transitionScoringLimitMenu = (
  currentMenu: ScoringLimitMenu,
  action: ScoringLimitStateAction,
): ScoringLimitMenu => {
  if (action === 'open-yakuman-menu') {
    return 'yakuman';
  }

  if (action === 'back-to-default' || action === 'reset') {
    return DEFAULT_SCORING_LIMIT_MENU;
  }

  return currentMenu;
};

export type { ScoringLimitAction, ScoringLimitMenu, ScoringLimitStateAction, ScoringLimitVariant };
