// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Snackbar } from './Snackbar';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe('Snackbar', () => {
  it('renders an action button and closes after the action is invoked', () => {
    const handleAction = vi.fn();
    const handleClose = vi.fn();

    render(
      <Snackbar
        message="分析メモを残しますか？"
        isOpen
        onClose={handleClose}
        actionLabel="開く"
        onAction={handleAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '開く' }));

    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not auto close while an action button is shown', () => {
    const handleClose = vi.fn();

    render(
      <Snackbar
        message="分析メモを残しますか？"
        isOpen
        onClose={handleClose}
        actionLabel="開く"
        onAction={vi.fn()}
        autoHideDuration={3000}
      />,
    );

    vi.advanceTimersByTime(3000);

    expect(handleClose).not.toHaveBeenCalled();
  });
});
