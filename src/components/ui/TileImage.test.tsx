// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TileImage } from './TileImage';

afterEach(() => {
  cleanup();
});

describe('TileImage', () => {
  it('renders a composite tile with front and face svg layers', () => {
    render(<TileImage code="1m" ariaLabel="一萬テスト" />);

    const tile = screen.getByRole('img', { name: '一萬テスト' });
    const layers = tile.querySelectorAll('img');

    expect(layers).toHaveLength(2);
    expect(layers[0].getAttribute('src')).toContain('/img/tiles/light/Front.svg');
    expect(layers[1].getAttribute('src')).toContain('/img/tiles/light/Man1.svg');
    expect(layers[0].getAttribute('alt')).toBe('');
    expect(layers[1].getAttribute('alt')).toBe('');
  });

  it('renders back tile when showBack is true', () => {
    render(<TileImage code="1m" showBack ariaLabel="裏牌テスト" />);

    const tile = screen.getByRole('img', { name: '裏牌テスト' });
    const layers = tile.querySelectorAll('img');

    expect(layers).toHaveLength(1);
    expect(layers[0].getAttribute('src')).toContain('/img/tiles/light/Back.svg');
  });

  it('renders back tile with dark theme', () => {
    render(<TileImage code="1m" showBack theme="dark" ariaLabel="裏牌ダークテスト" />);

    const tile = screen.getByRole('img', { name: '裏牌ダークテスト' });
    const layers = tile.querySelectorAll('img');

    expect(layers).toHaveLength(1);
    expect(layers[0].getAttribute('src')).toContain('/img/tiles/dark/Back.svg');
  });

  it('keeps button semantics while using the same composite layers', () => {
    const handleClick = vi.fn();

    render(<TileImage code="0p" ariaLabel="赤五筒テスト" onClick={handleClick} pressed disabled />);

    const button = screen.getByRole('button', { name: '赤五筒テスト' });
    const layers = button.querySelectorAll('img');

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('disabled')).not.toBeNull();
    expect(layers).toHaveLength(2);
    expect(layers[1].getAttribute('src')).toContain('/img/tiles/light/Pin5-Dora.svg');

    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });
});
