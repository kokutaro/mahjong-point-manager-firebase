// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DoraNotationInput } from './DoraNotationInput';

afterEach(() => {
  cleanup();
});

describe('DoraNotationInput', () => {
  it('renders preview tiles through the shared composite tile UI', () => {
    render(<DoraNotationInput value={['1m', '0p']} label="ドラ表示牌" onChange={vi.fn()} />);

    const firstTile = screen.getByRole('img', { name: '1萬' });
    const redTile = screen.getByRole('img', { name: '赤5筒' });

    expect(firstTile.querySelectorAll('img')).toHaveLength(2);
    expect(redTile.querySelectorAll('img')).toHaveLength(2);
  });
});
