// @vitest-environment jsdom

import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GameSettings } from '../../types';
import { createDefaultRoomSettings } from '../../utils/roomDefaults';
import { RoomRuleSettings } from './RoomRuleSettings';

const RoomRuleSettingsHarness = () => {
  const [settings, setSettings] = useState<GameSettings>({
    ...createDefaultRoomSettings('4ma'),
  });

  return (
    <>
      <RoomRuleSettings settings={settings} onChange={setSettings} />
      <div data-testid="yakitori-value">
        {String(settings.yakitoriEnabled)}-{settings.yakitoriPoint}
      </div>
    </>
  );
};

describe('RoomRuleSettings', () => {
  it('toggles yakitori and updates yakitori point', () => {
    render(<RoomRuleSettingsHarness />);

    fireEvent.click(screen.getByRole('checkbox', { name: '焼き鳥あり' }));
    fireEvent.change(screen.getByLabelText('焼き鳥点 (精算点)'), { target: { value: '20' } });

    expect(screen.getByTestId('yakitori-value').textContent).toBe('true-20');
  });
});
