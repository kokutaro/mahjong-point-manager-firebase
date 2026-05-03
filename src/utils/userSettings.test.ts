// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { normalizeUserSettings } from './userSettings';

describe('normalizeUserSettings', () => {
  it('fills yakitori defaults in room and competition settings', () => {
    const normalized = normalizeUserSettings({
      displayName: 'テスト',
      defaultRoomSettings: {
        mode: '4ma',
      },
      defaultCompetitionSettings: {},
    });

    expect(normalized.defaultRoomSettings.yakitoriEnabled).toBe(false);
    expect(normalized.defaultRoomSettings.yakitoriPoint).toBe(10);
    expect(normalized.defaultCompetitionSettings.yakitoriEnabled).toBe(false);
    expect(normalized.defaultCompetitionSettings.yakitoriPoint).toBe(10);
  });

  it('keeps explicit yakitori settings', () => {
    const normalized = normalizeUserSettings({
      displayName: 'テスト',
      defaultRoomSettings: {
        mode: '3ma',
        yakitoriEnabled: true,
        yakitoriPoint: 20,
      },
      defaultCompetitionSettings: {
        yakitoriEnabled: true,
        yakitoriPoint: 30,
      },
    });

    expect(normalized.defaultRoomSettings.yakitoriEnabled).toBe(true);
    expect(normalized.defaultRoomSettings.yakitoriPoint).toBe(20);
    expect(normalized.defaultCompetitionSettings.yakitoriEnabled).toBe(true);
    expect(normalized.defaultCompetitionSettings.yakitoriPoint).toBe(30);
  });
});
