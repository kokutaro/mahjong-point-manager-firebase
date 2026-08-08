// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '../../types';
import { AdjustmentModal } from './AdjustmentModal';

afterEach(() => {
  cleanup();
});

const players: Player[] = [
  { id: 'p1', name: 'Alice', score: 25000, isRiichi: false, wind: 'East', chip: 0 },
  { id: 'p2', name: 'Bob', score: 25000, isRiichi: false, wind: 'South', chip: 0 },
];

const selectParticipants = () => {
  fireEvent.click(screen.getAllByRole('button', { name: 'Alice' })[0]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Bob' })[1]);
};

describe('AdjustmentModal', () => {
  it('submits an arbitrary amount in 100-point increments', () => {
    const onConfirm = vi.fn();
    render(<AdjustmentModal isOpen onClose={vi.fn()} players={players} onConfirm={onConfirm} />);
    selectParticipants();

    const amountInput = screen.getByRole('spinbutton', { name: '一人あたりの点数' });
    expect(amountInput.getAttribute('min')).toBe('100');
    expect(amountInput.getAttribute('step')).toBe('100');

    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: '確定' }));

    expect(onConfirm).toHaveBeenCalledWith({
      payerId: 'p1',
      receiverIds: ['p2'],
      amount: 500,
      description: undefined,
    });
  });

  it('does not allow an amount outside 100-point increments', () => {
    const onConfirm = vi.fn();
    render(<AdjustmentModal isOpen onClose={vi.fn()} players={players} onConfirm={onConfirm} />);
    selectParticipants();

    const amountInput = screen.getByRole('spinbutton', { name: '一人あたりの点数' });
    fireEvent.change(amountInput, { target: { value: '150' } });

    expect(amountInput.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('100点単位で入力してください')).not.toBeNull();
    expect(screen.getByRole('button', { name: '確定' }).hasAttribute('disabled')).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '1,000' }));
    expect(screen.queryByText('100点単位で入力してください')).toBeNull();
    expect((amountInput as HTMLInputElement).value).toBe('');
  });

  it('resets the transfer when cancelled', () => {
    const onClose = vi.fn();
    render(<AdjustmentModal isOpen onClose={onClose} players={players} onConfirm={vi.fn()} />);
    selectParticipants();
    fireEvent.change(screen.getByRole('spinbutton', { name: '一人あたりの点数' }), {
      target: { value: '500' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '確定' }).hasAttribute('disabled')).toBe(true);
  });
});
