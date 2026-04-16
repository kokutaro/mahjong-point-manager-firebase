// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompetitionSettings } from '../../types';
import { CompetitionForm } from './CompetitionForm';

afterEach(() => {
  cleanup();
});

describe('CompetitionForm', () => {
  it('uses provided initial rule settings', () => {
    const onSubmit = vi.fn();
    const initialSettings: CompetitionSettings = {
      length: 'Tonpu',
      startPoint4ma: 30000,
      startPoint3ma: 40000,
      returnPoint4ma: 30000,
      returnPoint3ma: 45000,
      uma: [5, 10],
      hasHonba: false,
      honbaPoints: 0,
      tenpaiRenchan: false,
      useTobi: false,
      useChip: true,
      chipRate: 100,
      useOka: false,
      useFuCalculation: false,
      noFuFixedPoints: {
        1: { child: 1200, dealer: 1800 },
        2: { child: 2400, dealer: 3600 },
        3: { child: 4800, dealer: 7200 },
      },
      westExtension: true,
      rate: 100,
    };

    render(
      <CompetitionForm
        onSubmit={onSubmit}
        organizerDisplayName="設定済み主催者"
        initialSettings={initialSettings}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].settings).toEqual(initialSettings);
  });

  it('updates organizer display name and rule settings when props change', () => {
    const onSubmit = vi.fn();
    const nextSettings: CompetitionSettings = {
      length: 'Tonpu',
      startPoint4ma: 30000,
      startPoint3ma: 40000,
      returnPoint4ma: 30000,
      returnPoint3ma: 45000,
      uma: [5, 10],
      hasHonba: false,
      honbaPoints: 0,
      tenpaiRenchan: false,
      useTobi: false,
      useChip: true,
      chipRate: 100,
      useOka: false,
      useFuCalculation: false,
      noFuFixedPoints: {
        1: { child: 1200, dealer: 1800 },
        2: { child: 2400, dealer: 3600 },
        3: { child: 4800, dealer: 7200 },
      },
      westExtension: true,
      rate: 100,
    };

    const { rerender } = render(
      <CompetitionForm onSubmit={onSubmit} organizerDisplayName="初期名" />,
    );

    rerender(
      <CompetitionForm
        onSubmit={onSubmit}
        organizerDisplayName="設定済み主催者"
        initialSettings={nextSettings}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].organizerDisplayName).toBe('設定済み主催者');
    expect(onSubmit.mock.calls[0][0].settings).toEqual(nextSettings);
  });

  it('does not overwrite in-progress organizer and rule edits when async defaults arrive', () => {
    const onSubmit = vi.fn();
    const asyncSettings: CompetitionSettings = {
      length: 'Hanchan',
      startPoint4ma: 30000,
      startPoint3ma: 40000,
      returnPoint4ma: 30000,
      returnPoint3ma: 45000,
      uma: [5, 10],
      hasHonba: false,
      honbaPoints: 0,
      tenpaiRenchan: false,
      useTobi: false,
      useChip: true,
      chipRate: 100,
      useOka: false,
      useFuCalculation: false,
      noFuFixedPoints: {
        1: { child: 1200, dealer: 1800 },
        2: { child: 2400, dealer: 3600 },
        3: { child: 4800, dealer: 7200 },
      },
      westExtension: true,
      rate: 100,
    };

    const { rerender } = render(
      <CompetitionForm onSubmit={onSubmit} organizerDisplayName="初期名" />,
    );

    fireEvent.change(screen.getByLabelText('主催者表示名'), {
      target: { value: '編集中主催者' },
    });
    fireEvent.click(screen.getByRole('button', { name: '東風' }));

    rerender(
      <CompetitionForm
        onSubmit={onSubmit}
        organizerDisplayName="設定済み主催者"
        initialSettings={asyncSettings}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].organizerDisplayName).toBe('編集中主催者');
    expect(onSubmit.mock.calls[0][0].settings).toEqual(
      expect.objectContaining({
        length: 'Tonpu',
      }),
    );
  });

  it('submits with organizer auto join enabled by default', () => {
    const onSubmit = vi.fn();

    render(<CompetitionForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText('例: 第1回麻雀大会');
    fireEvent.change(nameInput, { target: { value: '春季大会' } });

    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].autoJoinOrganizer).toBe(true);
    expect(onSubmit.mock.calls[0][0].organizerDisplayName).toBe('主催者名');
  });

  it('submits with organizer auto join disabled when switch is off', () => {
    const onSubmit = vi.fn();

    render(<CompetitionForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText('例: 第1回麻雀大会');
    fireEvent.change(nameInput, { target: { value: '春季大会' } });

    fireEvent.click(screen.getByLabelText('大会に参加する'));
    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].autoJoinOrganizer).toBe(false);
  });

  it('shows organizer display name field only when auto join is enabled', () => {
    const onSubmit = vi.fn();

    render(<CompetitionForm onSubmit={onSubmit} />);

    expect(screen.queryByLabelText('主催者表示名')).not.toBeNull();

    fireEvent.click(screen.getByLabelText('大会に参加する'));

    expect(screen.queryByLabelText('主催者表示名')).toBeNull();
  });

  it('submits organizer display name entered in form', () => {
    const onSubmit = vi.fn();

    render(<CompetitionForm onSubmit={onSubmit} organizerDisplayName="初期名" />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.change(screen.getByLabelText('主催者表示名'), {
      target: { value: '司会太郎' },
    });

    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].organizerDisplayName).toBe('司会太郎');
  });

  it('trims organizer display name before submit', () => {
    const onSubmit = vi.fn();

    render(<CompetitionForm onSubmit={onSubmit} organizerDisplayName="初期名" />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.change(screen.getByLabelText('主催者表示名'), {
      target: { value: '  司会太郎  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].organizerDisplayName).toBe('司会太郎');
  });

  it('prevents submit when organizer display name is only whitespace', () => {
    const onSubmit = vi.fn();

    render(<CompetitionForm onSubmit={onSubmit} organizerDisplayName="初期名" />);

    fireEvent.change(screen.getByPlaceholderText('例: 第1回麻雀大会'), {
      target: { value: '春季大会' },
    });
    fireEvent.change(screen.getByLabelText('主催者表示名'), {
      target: { value: '   ' },
    });

    fireEvent.click(screen.getByRole('button', { name: '大会を作成' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
