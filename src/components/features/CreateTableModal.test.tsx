// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateTableModal } from './CreateTableModal';

afterEach(cleanup);

describe('CreateTableModal', () => {
  it('creates a table with the selected rank', async () => {
    const onCreateTable = vi.fn().mockResolvedValue(undefined);

    render(<CreateTableModal isOpen onClose={vi.fn()} onCreateTable={onCreateTable} />);

    fireEvent.change(screen.getByPlaceholderText('卓名（例: A卓）'), {
      target: { value: '上位卓' },
    });
    fireEvent.change(screen.getByLabelText('卓ランク'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '作成' }));

    await waitFor(() => expect(onCreateTable).toHaveBeenCalledWith('上位卓', '4ma', 2));
  });
});
