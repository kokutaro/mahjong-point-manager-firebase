import {
  YAKUMAN_DEFS,
  YAKU_DEFS,
  type YakumanDefinition,
  type YakumanId,
  type YakuDefinition,
  type YakuId,
} from '../types/analysis';

export type YakuGroupId = (typeof YAKU_DEFS)[YakuId]['group'];
export type YakumanGroupId = 'single' | 'double';

export interface YakuSelectorOption extends YakuDefinition {
  id: YakuId;
}

export interface YakumanSelectorOption extends YakumanDefinition {
  id: YakumanId;
}

export interface YakuGroupSection {
  id: YakuGroupId;
  label: string;
  items: YakuSelectorOption[];
}

export interface YakumanGroupSection {
  id: YakumanGroupId;
  label: string;
  items: YakumanSelectorOption[];
}

export const YAKU_GROUP_ORDER = [
  '1han',
  '2han',
  '3han',
  '6han',
] as const satisfies readonly YakuGroupId[];
export const YAKUMAN_GROUP_ORDER = [
  'single',
  'double',
] as const satisfies readonly YakumanGroupId[];

export const YAKU_GROUP_LABELS: Record<YakuGroupId, string> = {
  '1han': '1翻',
  '2han': '2翻',
  '3han': '3翻',
  '6han': '6翻',
};

export const YAKUMAN_GROUP_LABELS: Record<YakumanGroupId, string> = {
  single: '役満',
  double: 'ダブル役満',
};

const YAKU_OPTIONS: YakuSelectorOption[] = (
  Object.entries(YAKU_DEFS) as [YakuId, YakuDefinition][]
).map(([id, definition]) => ({
  id,
  ...definition,
}));

const YAKUMAN_OPTIONS: YakumanSelectorOption[] = (
  Object.entries(YAKUMAN_DEFS) as [YakumanId, YakumanDefinition][]
).map(([id, definition]) => ({
  id,
  ...definition,
}));

export const YAKU_GROUP_SECTIONS: YakuGroupSection[] = YAKU_GROUP_ORDER.map((groupId) => ({
  id: groupId,
  label: YAKU_GROUP_LABELS[groupId],
  items: YAKU_OPTIONS.filter((option) => option.group === groupId),
}));

export const YAKUMAN_GROUP_SECTIONS: YakumanGroupSection[] = YAKUMAN_GROUP_ORDER.map((groupId) => ({
  id: groupId,
  label: YAKUMAN_GROUP_LABELS[groupId],
  items: YAKUMAN_OPTIONS.filter((option) => {
    return groupId === 'single' ? option.multiplier === 1 : option.multiplier > 1;
  }),
}));

export const getYakuDefinition = (id: YakuId): YakuDefinition => {
  return YAKU_DEFS[id];
};

export const getYakumanDefinition = (id: YakumanId): YakumanDefinition => {
  return YAKUMAN_DEFS[id];
};

export const getYakuIdsByGroup = (groupId: YakuGroupId): YakuId[] => {
  return (
    YAKU_GROUP_SECTIONS.find((section) => section.id === groupId)?.items.map((item) => item.id) ??
    []
  );
};

export const getYakumanIdsByGroup = (groupId: YakumanGroupId): YakumanId[] => {
  return (
    YAKUMAN_GROUP_SECTIONS.find((section) => section.id === groupId)?.items.map(
      (item) => item.id,
    ) ?? []
  );
};
