// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisYaku } from '../../../types';
import { YakuSelector } from './YakuSelector';

afterEach(() => {
  cleanup();
});

interface YakuSelectorHarnessProps {
  initialValue?: AnalysisYaku;
  readOnly?: boolean;
}

const createYakuValue = (overrides: Partial<AnalysisYaku> = {}): AnalysisYaku => ({
  list: [],
  yakuman: [],
  ippatsu: false,
  riichi: 'none',
  special: null,
  ...overrides,
});

const YakuSelectorHarness = ({
  initialValue = createYakuValue(),
  readOnly = false,
}: YakuSelectorHarnessProps) => {
  const [value, setValue] = useState<AnalysisYaku>(initialValue);

  return (
    <>
      <YakuSelector value={value} readOnly={readOnly} onChange={setValue} />
      <output aria-label="riichi-state">{value.riichi}</output>
      <output aria-label="yaku-list">{value.list.join(',') || 'none'}</output>
      <output aria-label="ippatsu-state">{String(value.ippatsu)}</output>
      <output aria-label="special-state">{value.special ?? 'none'}</output>
      <output aria-label="yakuman-list">{value.yakuman.join(',') || 'none'}</output>
    </>
  );
};

describe('YakuSelector', () => {
  it('syncs the riichi select value into the yaku list', () => {
    render(<YakuSelectorHarness />);

    fireEvent.change(screen.getByLabelText('立直状態'), { target: { value: 'normal' } });
    expect(screen.getByLabelText('riichi-state').textContent).toBe('normal');
    expect(screen.getByLabelText('yaku-list').textContent).toBe('riichi');

    fireEvent.change(screen.getByLabelText('立直状態'), { target: { value: 'double' } });
    expect(screen.getByLabelText('riichi-state').textContent).toBe('double');
    expect(screen.getByLabelText('yaku-list').textContent).toBe('doubleRiichi');

    fireEvent.change(screen.getByLabelText('立直状態'), { target: { value: 'none' } });
    expect(screen.getByLabelText('riichi-state').textContent).toBe('none');
    expect(screen.getByLabelText('yaku-list').textContent).toBe('none');
  });

  it('syncs riichi checkboxes back into the riichi state', () => {
    render(<YakuSelectorHarness />);

    fireEvent.click(screen.getByRole('checkbox', { name: '立直' }));
    expect(screen.getByLabelText('riichi-state').textContent).toBe('normal');
    expect(screen.getByLabelText('yaku-list').textContent).toBe('riichi');

    fireEvent.click(screen.getByRole('checkbox', { name: 'ダブル立直' }));
    expect(screen.getByLabelText('riichi-state').textContent).toBe('double');
    expect(screen.getByLabelText('yaku-list').textContent).toBe('doubleRiichi');

    fireEvent.click(screen.getByRole('checkbox', { name: 'ダブル立直' }));
    expect(screen.getByLabelText('riichi-state').textContent).toBe('none');
    expect(screen.getByLabelText('yaku-list').textContent).toBe('none');
  });

  it('toggles ippatsu', () => {
    render(<YakuSelectorHarness />);

    fireEvent.click(screen.getByRole('checkbox', { name: '一発' }));
    expect(screen.getByLabelText('ippatsu-state').textContent).toBe('true');

    fireEvent.click(screen.getByRole('checkbox', { name: '一発' }));
    expect(screen.getByLabelText('ippatsu-state').textContent).toBe('false');
  });

  it('updates the special win selection', () => {
    render(<YakuSelectorHarness />);

    fireEvent.change(screen.getByLabelText('特殊和了'), { target: { value: 'rinshan' } });
    expect(screen.getByLabelText('special-state').textContent).toBe('rinshan');

    fireEvent.change(screen.getByLabelText('特殊和了'), { target: { value: 'none' } });
    expect(screen.getByLabelText('special-state').textContent).toBe('none');
  });

  it('toggles yakuman selections', () => {
    render(<YakuSelectorHarness />);

    fireEvent.click(screen.getByRole('checkbox', { name: '国士無双' }));
    expect(screen.getByLabelText('yakuman-list').textContent).toBe('kokushiMusou');

    fireEvent.click(screen.getByRole('checkbox', { name: '国士無双' }));
    expect(screen.getByLabelText('yakuman-list').textContent).toBe('none');
  });

  it('disables controls in readOnly mode', () => {
    render(
      <YakuSelectorHarness
        initialValue={createYakuValue({
          list: ['riichi'],
          yakuman: ['kokushiMusou'],
          ippatsu: true,
          riichi: 'normal',
          special: 'haitei',
        })}
        readOnly
      />,
    );

    const riichiSelect = screen.getByLabelText('立直状態');
    const specialSelect = screen.getByLabelText('特殊和了');
    const ippatsu = screen.getByRole('checkbox', { name: '一発' });
    const riichi = screen.getByRole('checkbox', { name: '立直' });
    const kokushi = screen.getByRole('checkbox', { name: '国士無双' });

    expect((riichiSelect as HTMLSelectElement).disabled).toBe(true);
    expect((specialSelect as HTMLSelectElement).disabled).toBe(true);
    expect((ippatsu as HTMLInputElement).disabled).toBe(true);
    expect((riichi as HTMLInputElement).disabled).toBe(true);
    expect((kokushi as HTMLInputElement).disabled).toBe(true);

    expect(screen.getByLabelText('riichi-state').textContent).toBe('normal');
    expect(screen.getByLabelText('yaku-list').textContent).toBe('riichi');
    expect(screen.getByLabelText('ippatsu-state').textContent).toBe('true');
    expect(screen.getByLabelText('special-state').textContent).toBe('haitei');
    expect(screen.getByLabelText('yakuman-list').textContent).toBe('kokushiMusou');
  });
});
