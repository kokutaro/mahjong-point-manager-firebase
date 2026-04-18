// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HandLog } from '../../types';
import type { AnalysisEventSummary } from '../../utils/analysisEvents';
import { AnalysisEventList } from './AnalysisEventList';
import styles from './AnalysisEventList.module.css';

afterEach(() => {
  cleanup();
});

const baseHandLog: HandLog = {
  id: 'hand-1',
  timestamp: 1710000000000,
  round: {
    wind: 'East',
    number: 1,
    honba: 0,
    riichiSticks: 0,
  },
  result: {
    type: 'Win',
    winners: [
      {
        id: 'player-1',
        payment: {
          basePoints: 2000,
          name: '40符3翻',
          ron: 7700,
        },
      },
    ],
    loserId: 'player-2',
    scoreDeltas: {
      'player-1': 7700,
      'player-2': -7700,
    },
  },
};

const createEvent = ({
  id = 'event-1',
  handLogId = 'hand-1',
  eventLabel = '和了',
  roundLabel = '東1局 0本場',
  locationLabel = '第1戦',
  summary = '対面から和了',
  scoreDeltaLabel = '+7,700',
}: {
  id?: string;
  handLogId?: string;
  eventLabel?: string;
  roundLabel?: string;
  locationLabel?: string;
  summary?: string;
  scoreDeltaLabel?: string;
} = {}): AnalysisEventSummary => ({
  id,
  source: {
    kind: 'room',
    roomId: 'room-1',
    handLogId,
  },
  handLog: {
    ...baseHandLog,
    id: handLogId,
  },
  players: [
    { id: 'player-1', name: '自分', wind: 'East' },
    { id: 'player-2', name: '対面', wind: 'South' },
  ],
  eventType: eventLabel === '放銃' ? 'deal-in' : 'win',
  eventLabel,
  roundLabel,
  locationLabel,
  summary,
  scoreDeltaLabel,
  timestamp: 1710000000000,
});

describe('AnalysisEventList', () => {
  it('renders the empty state message', () => {
    render(
      <AnalysisEventList
        events={[]}
        emptyMessage="保存済みの分析イベントはありません。"
        onSelect={vi.fn()}
      />,
    );

    const emptyState = screen.getByText('保存済みの分析イベントはありません。');
    expect(emptyState.className).toContain(styles.empty);
  });

  it('renders saved badges, score classes, and calls onSelect', () => {
    const handleSelect = vi.fn();
    const savedEvent = createEvent();
    const negativeEvent = createEvent({
      id: 'event-2',
      handLogId: 'hand-2',
      eventLabel: '放銃',
      roundLabel: '東2局 0本場',
      summary: '自分が放銃',
      scoreDeltaLabel: '-1,000',
    });
    const zeroEvent = createEvent({
      id: 'event-3',
      handLogId: 'hand-3',
      roundLabel: '東3局 0本場',
      summary: '移動なし',
      scoreDeltaLabel: '0',
    });

    render(
      <AnalysisEventList
        events={[savedEvent, negativeEvent, zeroEvent]}
        savedHandLogIds={new Set(['hand-1'])}
        onSelect={handleSelect}
      />,
    );

    expect(screen.getByText('ノートあり')).not.toBeNull();
    expect(screen.getAllByText('未入力')).toHaveLength(2);
    expect(screen.getByText('+7,700').className).toContain(styles.positive);
    expect(screen.getByText('-1,000').className).toContain(styles.negative);
    expect(screen.getByText('0').className).toContain(styles.zero);

    fireEvent.click(screen.getByRole('button', { name: '東1局 0本場 和了' }));

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(savedEvent);
  });
});
