// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisEventType, Meld, TileCode } from '../../../types';
import { HandInputSection } from './HandInputSection';

afterEach(() => {
  cleanup();
});

interface HandInputSectionHarnessProps {
  initialConcealed?: TileCode[];
  initialMelds?: Meld[];
  initialWinningTile?: TileCode;
  eventType?: AnalysisEventType;
  readOnly?: boolean;
}

const HandInputSectionHarness = ({
  initialConcealed = [],
  initialMelds = [],
  initialWinningTile,
  eventType = 'win',
  readOnly = false,
}: HandInputSectionHarnessProps) => {
  const [concealed, setConcealed] = useState<TileCode[]>(initialConcealed);
  const [melds, setMelds] = useState<Meld[]>(initialMelds);
  const [winningTile, setWinningTile] = useState<TileCode | undefined>(initialWinningTile);

  return (
    <>
      <HandInputSection
        concealed={concealed}
        melds={melds}
        winningTile={winningTile}
        eventType={eventType}
        readOnly={readOnly}
        onConcealedChange={setConcealed}
        onMeldsChange={setMelds}
        onWinningTileChange={setWinningTile}
      />
      <output aria-label="concealed-state">{concealed.join(',') || 'none'}</output>
      <output aria-label="melds-state">{melds.length > 0 ? JSON.stringify(melds) : 'none'}</output>
      <output aria-label="winning-tile-state">{winningTile ?? 'none'}</output>
    </>
  );
};

describe('HandInputSection', () => {
  it('renders the MPSZ input field', () => {
    render(<HandInputSectionHarness />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    expect(input).toBeTruthy();
  });

  it('parses MPSZ notation and updates concealed tiles', () => {
    render(<HandInputSectionHarness />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    fireEvent.change(input, { target: { value: 'm123' } });

    expect(screen.getByLabelText('concealed-state').textContent).toBe('1m,2m,3m');
  });

  it('parses tsumo notation and sets winning tile', () => {
    render(<HandInputSectionHarness />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    fireEvent.change(input, { target: { value: 'm1234_' } });

    expect(screen.getByLabelText('concealed-state').textContent).toBe('1m,2m,3m');
    expect(screen.getByLabelText('winning-tile-state').textContent).toBe('4m');
  });

  it('parses ron notation and sets winning tile', () => {
    render(<HandInputSectionHarness />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    fireEvent.change(input, { target: { value: 'm1234-' } });

    expect(screen.getByLabelText('concealed-state').textContent).toBe('1m,2m,3m');
    expect(screen.getByLabelText('winning-tile-state').textContent).toBe('4m');
  });

  it('parses melds from notation', () => {
    render(<HandInputSectionHarness />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    fireEvent.change(input, { target: { value: 'm11,z111-' } });

    expect(screen.getByLabelText('concealed-state').textContent).toBe('1m,1m');
    const meldsOutput = screen.getByLabelText('melds-state').textContent;
    expect(meldsOutput).not.toBe('none');
    const melds = JSON.parse(meldsOutput!);
    expect(melds).toHaveLength(1);
    expect(melds[0].kind).toBe('pon');
  });

  it('clears concealed tiles when input is emptied', () => {
    render(<HandInputSectionHarness initialConcealed={['1m', '2m']} initialMelds={[]} />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.getByLabelText('concealed-state').textContent).toBe('none');
  });

  it('disables MPSZ input in readOnly mode', () => {
    render(<HandInputSectionHarness readOnly />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  it('does not set winning tile for tenpai-draw event type', () => {
    render(<HandInputSectionHarness eventType="tenpai-draw" />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    fireEvent.change(input, { target: { value: 'm1234_' } });

    expect(screen.getByLabelText('winning-tile-state').textContent).toBe('none');
  });

  it('shows parse error for invalid input', () => {
    render(<HandInputSectionHarness />);

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    fireEvent.change(input, { target: { value: 'x123' } });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).not.toBe('');
  });
});
