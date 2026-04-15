// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompetitionForm } from './CompetitionForm';

afterEach(() => {
  cleanup();
});

describe('CompetitionForm', () => {
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
