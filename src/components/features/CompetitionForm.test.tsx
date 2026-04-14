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
});
