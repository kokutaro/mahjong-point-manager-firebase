// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisEventType, TileCode } from '../../../types';
import { HandInputSection } from './HandInputSection';

afterEach(() => {
  cleanup();
});

interface HandInputSectionHarnessProps {
  initialConcealed?: TileCode[];
  initialWinningTile?: TileCode;
  eventType?: AnalysisEventType;
  readOnly?: boolean;
}

const HandInputSectionHarness = ({
  initialConcealed = [],
  initialWinningTile,
  eventType = 'win',
  readOnly = false,
}: HandInputSectionHarnessProps) => {
  const [concealed, setConcealed] = useState<TileCode[]>(initialConcealed);
  const [winningTile, setWinningTile] = useState<TileCode | undefined>(initialWinningTile);

  return (
    <>
      <HandInputSection
        concealed={concealed}
        winningTile={winningTile}
        eventType={eventType}
        readOnly={readOnly}
        onConcealedChange={setConcealed}
        onWinningTileChange={setWinningTile}
      />
      <output aria-label="concealed-state">{concealed.join(',') || 'none'}</output>
      <output aria-label="winning-tile-state">{winningTile ?? 'none'}</output>
    </>
  );
};

describe('HandInputSection', () => {
  it('adds and removes concealed tiles', () => {
    render(<HandInputSectionHarness initialConcealed={['2m']} />);

    fireEvent.click(screen.getByRole('button', { name: '手牌に1mを追加' }));
    expect(screen.getByLabelText('concealed-state').textContent).toBe('2m,1m');

    fireEvent.click(screen.getByRole('button', { name: '手牌から2mを削除' }));
    expect(screen.getByLabelText('concealed-state').textContent).toBe('1m');
  });

  it('sets and clears the winning tile', () => {
    render(<HandInputSectionHarness initialConcealed={['1m', '2m']} />);

    fireEvent.click(screen.getByRole('button', { name: '和了牌に2mを設定' }));
    expect(screen.getByLabelText('winning-tile-state').textContent).toBe('2m');

    fireEvent.click(screen.getByRole('button', { name: '和了牌から2mを削除' }));
    expect(screen.getByLabelText('winning-tile-state').textContent).toBe('none');
  });

  it('deduplicates winning tile candidates from concealed tiles', () => {
    render(<HandInputSectionHarness initialConcealed={['1m', '1m', '2m']} />);

    expect(screen.getAllByRole('button', { name: '和了牌に1mを設定' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '和了牌に2mを設定' })).toHaveLength(1);
  });

  it('clears the winning tile when the last matching concealed tile is removed', () => {
    render(<HandInputSectionHarness initialConcealed={['1m', '2m']} initialWinningTile="1m" />);

    fireEvent.click(screen.getByRole('button', { name: '手牌から1mを削除' }));

    expect(screen.getByLabelText('concealed-state').textContent).toBe('2m');
    expect(screen.getByLabelText('winning-tile-state').textContent).toBe('none');
  });

  it('disables tile editing in readOnly mode', () => {
    render(<HandInputSectionHarness initialConcealed={['1m']} initialWinningTile="1m" readOnly />);

    const addButton = screen.getByRole('button', { name: '手牌に2mを追加' });
    const removeButton = screen.getByRole('button', { name: '手牌から1mを削除' });
    const winningTileButton = screen.getByRole('button', { name: '和了牌から1mを削除' });

    expect((addButton as HTMLButtonElement).disabled).toBe(true);
    expect((removeButton as HTMLButtonElement).disabled).toBe(true);
    expect((winningTileButton as HTMLButtonElement).disabled).toBe(true);

    expect(screen.getByLabelText('concealed-state').textContent).toBe('1m');
    expect(screen.getByLabelText('winning-tile-state').textContent).toBe('1m');
  });
});
