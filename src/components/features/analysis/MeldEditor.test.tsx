// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Meld } from '../../../types';
import { MeldEditor } from './MeldEditor';

afterEach(() => {
  cleanup();
});

interface MeldEditorHarnessProps {
  initialMelds?: Meld[];
  readOnly?: boolean;
}

const MeldEditorHarness = ({ initialMelds = [], readOnly = false }: MeldEditorHarnessProps) => {
  const [melds, setMelds] = useState<Meld[]>(initialMelds);

  return (
    <>
      <MeldEditor melds={melds} readOnly={readOnly} onChange={setMelds} />
      <output aria-label="meld-count">{String(melds.length)}</output>
    </>
  );
};

const setTileDraft = (index: number, value: string) => {
  fireEvent.change(screen.getByLabelText(`鳴き牌 ${index}`), {
    target: { value },
  });
};

describe('MeldEditor', () => {
  it('adds chi, pon, minkan, and ankan melds', () => {
    render(<MeldEditorHarness />);

    setTileDraft(1, '1m');
    setTileDraft(2, '2m');
    setTileDraft(3, '3m');
    fireEvent.click(screen.getByRole('button', { name: '鳴きを追加' }));
    expect(screen.getByText(/chi \/ 1m 2m 3m \/ kamicha/)).not.toBeNull();

    fireEvent.change(screen.getByLabelText('種類'), { target: { value: 'pon' } });
    fireEvent.change(screen.getByLabelText('鳴いた方向'), { target: { value: 'toimen' } });
    setTileDraft(1, '5p');
    setTileDraft(2, '5p');
    setTileDraft(3, '5p');
    fireEvent.click(screen.getByRole('button', { name: '鳴きを追加' }));
    expect(screen.getByText(/pon \/ 5p 5p 5p \/ toimen/)).not.toBeNull();

    fireEvent.change(screen.getByLabelText('種類'), { target: { value: 'minkan' } });
    fireEvent.change(screen.getByLabelText('鳴いた方向'), { target: { value: 'shimocha' } });
    setTileDraft(1, '9s');
    setTileDraft(2, '9s');
    setTileDraft(3, '9s');
    setTileDraft(4, '9s');
    fireEvent.click(screen.getByRole('button', { name: '鳴きを追加' }));
    expect(screen.getByText(/minkan \/ 9s 9s 9s 9s \/ shimocha/)).not.toBeNull();

    fireEvent.change(screen.getByLabelText('種類'), { target: { value: 'ankan' } });
    setTileDraft(1, '1z');
    setTileDraft(2, '1z');
    setTileDraft(3, '1z');
    setTileDraft(4, '1z');
    fireEvent.click(screen.getByRole('button', { name: '鳴きを追加' }));
    expect(screen.getByText(/ankan \/ 1z 1z 1z 1z/)).not.toBeNull();
    expect(screen.getByLabelText('meld-count').textContent).toBe('4');
  });

  it('updates slot count and direction behavior when switching meld kind', () => {
    render(<MeldEditorHarness />);

    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect((screen.getByLabelText('鳴いた方向') as HTMLSelectElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('種類'), { target: { value: 'minkan' } });
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
    expect((screen.getByLabelText('鳴いた方向') as HTMLSelectElement).disabled).toBe(false);

    fireEvent.change(screen.getByLabelText('鳴いた方向'), { target: { value: 'shimocha' } });
    expect((screen.getByLabelText('鳴いた方向') as HTMLSelectElement).value).toBe('shimocha');

    fireEvent.change(screen.getByLabelText('種類'), { target: { value: 'chi' } });
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect((screen.getByLabelText('鳴いた方向') as HTMLSelectElement).value).toBe('kamicha');
    expect((screen.getByLabelText('鳴いた方向') as HTMLSelectElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('種類'), { target: { value: 'ankan' } });
    expect(screen.queryByLabelText('鳴いた方向')).toBeNull();
  });

  it('shows an incomplete draft warning before adding', () => {
    render(<MeldEditorHarness />);

    setTileDraft(1, '1m');

    expect(screen.getByText('鳴き候補の入力が未完成です。')).not.toBeNull();
  });

  it('does not allow adding an invalid meld', () => {
    render(<MeldEditorHarness />);

    setTileDraft(1, '1m');
    setTileDraft(2, '1m');
    setTileDraft(3, '1m');

    const addButton = screen.getByRole('button', { name: '鳴きを追加' });
    expect((addButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(addButton);

    expect(screen.getByLabelText('meld-count').textContent).toBe('0');
    expect(screen.getByText('未入力')).not.toBeNull();
  });

  it('removes an added meld', () => {
    render(
      <MeldEditorHarness
        initialMelds={[{ kind: 'pon', tiles: ['3p', '3p', '3p'], from: 'toimen' }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '鳴きを1件目から削除' }));

    expect(screen.getByLabelText('meld-count').textContent).toBe('0');
    expect(screen.getByText('未入力')).not.toBeNull();
  });

  it('disables editing in readOnly mode', () => {
    render(
      <MeldEditorHarness
        initialMelds={[{ kind: 'chi', tiles: ['1m', '2m', '3m'], from: 'kamicha' }]}
        readOnly
      />,
    );

    const kindSelect = screen.getByLabelText('種類');
    const tileInput = screen.getByLabelText('鳴き牌 1');
    const paletteButton = screen.getByRole('button', { name: '鳴き候補に1mを追加' });
    const addButton = screen.getByRole('button', { name: '鳴きを追加' });
    const removeButton = screen.getByRole('button', { name: '鳴きを1件目から削除' });

    expect((kindSelect as HTMLSelectElement).disabled).toBe(true);
    expect((tileInput as HTMLInputElement).disabled).toBe(true);
    expect((paletteButton as HTMLButtonElement).disabled).toBe(true);
    expect((addButton as HTMLButtonElement).disabled).toBe(true);
    expect((removeButton as HTMLButtonElement).disabled).toBe(true);
  });
});
