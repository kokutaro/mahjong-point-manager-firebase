// @vitest-environment jsdom

import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_COMPETITION_SETTINGS } from '../../utils/competitionDefaults';
import type { CompetitionSettings } from '../../types';
import { CompetitionRuleSettings } from './CompetitionRuleSettings';

afterEach(() => {
  cleanup();
});

const CompetitionRuleSettingsHarness = () => {
  const [settings, setSettings] = useState<CompetitionSettings>({
    ...DEFAULT_COMPETITION_SETTINGS,
    uma: [15, 25],
  });

  return (
    <>
      <CompetitionRuleSettings settings={settings} onChange={setSettings} />
      <div data-testid="uma-value">{settings.uma.join('-')}</div>
      <div data-testid="point-value">
        {settings.startPoint4ma}-{settings.returnPoint4ma}-{settings.startPoint3ma}-
        {settings.returnPoint3ma}
      </div>
    </>
  );
};

describe('CompetitionRuleSettings', () => {
  it('switches from custom uma inputs to the none preset', () => {
    render(<CompetitionRuleSettingsHarness />);

    const umaField = screen.getByText('ウマ (順位点)').parentElement;
    expect(umaField).not.toBeNull();

    const scoped = within(umaField as HTMLElement);
    expect(scoped.getAllByRole('spinbutton')).toHaveLength(2);

    fireEvent.click(scoped.getByRole('button', { name: 'なし' }));

    expect(screen.getByTestId('uma-value').textContent).toBe('0-0');
    expect(scoped.queryAllByRole('spinbutton')).toHaveLength(0);
  });

  it('normalizes point inputs to 1000-point units', () => {
    render(<CompetitionRuleSettingsHarness />);

    const startPointField = screen.getByText('配給原点').parentElement;
    expect(startPointField).not.toBeNull();
    const scopedStart = within(startPointField as HTMLElement);
    const startInputs = scopedStart.getAllByRole('spinbutton');

    fireEvent.change(startInputs[0], { target: { value: '25666' } });

    expect(screen.getByTestId('point-value').textContent).toBe('26000-30000-35000-40000');
  });

  it('applies point presets from buttons', () => {
    render(<CompetitionRuleSettingsHarness />);

    fireEvent.click(screen.getByRole('button', { name: '4麻 30000 / 30000' }));
    fireEvent.click(screen.getByRole('button', { name: '3麻 35000 / 40000' }));

    expect(screen.getByTestId('point-value').textContent).toBe('30000-30000-35000-40000');
  });
});
