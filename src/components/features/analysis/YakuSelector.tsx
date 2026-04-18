import type { AnalysisYaku, YakumanId, YakuId } from '../../../types';
import { YAKUMAN_DEFS } from '../../../types';
import { YAKU_GROUP_SECTIONS, YAKUMAN_GROUP_SECTIONS } from '../../../utils/yaku';
import styles from './YakuSelector.module.css';

interface YakuSelectorProps {
  value: AnalysisYaku;
  readOnly: boolean;
  onChange: (value: AnalysisYaku) => void;
}

const SPECIAL_OPTIONS = [
  { value: 'none', label: 'なし' },
  { value: 'haitei', label: '海底' },
  { value: 'houtei', label: '河底' },
  { value: 'rinshan', label: '嶺上開花' },
  { value: 'chankan', label: '槍槓' },
] as const;

const toggleValue = <T extends string>(values: T[], value: T): T[] => {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
};

const syncRiichiState = (
  nextList: YakuId[],
  nextRiichi: AnalysisYaku['riichi'],
): AnalysisYaku['list'] => {
  const withoutRiichi = nextList.filter((item) => item !== 'riichi' && item !== 'doubleRiichi');

  if (nextRiichi === 'normal') {
    return [...withoutRiichi, 'riichi'];
  }

  if (nextRiichi === 'double') {
    return [...withoutRiichi, 'doubleRiichi'];
  }

  return withoutRiichi;
};

const getNextRiichiState = (
  target: YakuId,
  checked: boolean,
  current: AnalysisYaku['riichi'],
): AnalysisYaku['riichi'] => {
  if (target === 'riichi') {
    return checked ? 'normal' : current === 'normal' ? 'none' : current;
  }

  if (target === 'doubleRiichi') {
    return checked ? 'double' : current === 'double' ? 'none' : current;
  }

  return current;
};

const renderCheckbox = <T extends YakuId | YakumanId>(
  id: T,
  label: string,
  checked: boolean,
  readOnly: boolean,
  onToggle: () => void,
) => {
  return (
    <label key={id} className={styles.checkboxLabel}>
      <input type="checkbox" checked={checked} onChange={onToggle} disabled={readOnly} />
      <span>{label}</span>
    </label>
  );
};

export const YakuSelector = ({ value, readOnly, onChange }: YakuSelectorProps) => {
  return (
    <div className={styles.layout}>
      <div className={styles.metaGrid}>
        <label className={styles.metaField}>
          <span>立直状態</span>
          <select
            className={styles.select}
            value={value.riichi}
            onChange={(event) => {
              const nextRiichi = event.target.value as AnalysisYaku['riichi'];
              onChange({
                ...value,
                riichi: nextRiichi,
                list: syncRiichiState(value.list, nextRiichi),
              });
            }}
            disabled={readOnly}
          >
            <option value="none">なし</option>
            <option value="normal">通常立直</option>
            <option value="double">ダブル立直</option>
          </select>
        </label>

        <label className={styles.metaField}>
          <span>特殊和了</span>
          <select
            className={styles.select}
            value={value.special ?? 'none'}
            onChange={(event) => {
              const nextValue = event.target.value;
              onChange({
                ...value,
                special:
                  nextValue === 'none' ? null : (nextValue as NonNullable<AnalysisYaku['special']>),
              });
            }}
            disabled={readOnly}
          >
            {SPECIAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={value.ippatsu}
            onChange={() => {
              onChange({
                ...value,
                ippatsu: !value.ippatsu,
              });
            }}
            disabled={readOnly}
          />
          <span>一発</span>
        </label>
      </div>

      <div className={styles.groupList}>
        {YAKU_GROUP_SECTIONS.map((section) => (
          <section key={section.id} className={styles.groupSection}>
            <h4>{section.label}役</h4>
            <div className={styles.checkboxGrid}>
              {section.items.map((option) =>
                renderCheckbox(
                  option.id,
                  option.label,
                  value.list.includes(option.id),
                  readOnly,
                  () => {
                    const nextChecked = !value.list.includes(option.id);
                    const nextRiichi = getNextRiichiState(option.id, nextChecked, value.riichi);
                    const toggled = toggleValue(value.list, option.id);
                    onChange({
                      ...value,
                      riichi: nextRiichi,
                      list: syncRiichiState(toggled, nextRiichi),
                    });
                  },
                ),
              )}
            </div>
          </section>
        ))}

        <section className={styles.groupSection}>
          <h4>役満</h4>
          <div className={styles.checkboxGrid}>
            {YAKUMAN_GROUP_SECTIONS.flatMap((section) => section.items).map((option) =>
              renderCheckbox(
                option.id,
                YAKUMAN_DEFS[option.id].label,
                value.yakuman.includes(option.id),
                readOnly,
                () => {
                  onChange({
                    ...value,
                    yakuman: toggleValue(value.yakuman, option.id),
                  });
                },
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
