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
});
