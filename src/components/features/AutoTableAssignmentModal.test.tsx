// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AutoTableAssignmentProposal } from '../../utils/autoTableAssignment';
import { AutoTableAssignmentModal } from './AutoTableAssignmentModal';

afterEach(cleanup);

const proposal: AutoTableAssignmentProposal = {
  tables: [
    {
      tableId: 'table-1',
      tableName: 'A卓',
      rank: 1,
      mode: '4ma',
      existingParticipants: [{ id: 'manual', name: '手動選手' }],
      participants: [
        {
          id: 'p1',
          name: 'トップ選手',
          gameCount: 2,
          totalPoint: 45.5,
          averageRank: 1.5,
        },
        {
          id: 'p2',
          name: '初参加選手',
          gameCount: 0,
          totalPoint: 0,
          averageRank: null,
        },
      ],
    },
  ],
  assignmentCount: 2,
  unassignedParticipantIds: ['p3'],
  standingSource: 'competition',
};

describe('AutoTableAssignmentModal', () => {
  it('shows a reviewable proposal and only applies it after explicit confirmation', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <AutoTableAssignmentModal
        isOpen
        proposal={proposal}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('ランク1')).not.toBeNull();
    expect(screen.getByText('4麻')).not.toBeNull();
    expect(screen.getByText('A卓')).not.toBeNull();
    expect(screen.getByText('手動選手')).not.toBeNull();
    expect(screen.getByText('手動配置を維持')).not.toBeNull();
    expect(screen.getByText('トップ選手')).not.toBeNull();
    expect(screen.getByText('累計 45.5 / 平均順位 1.5')).not.toBeNull();
    expect(screen.getByText('初参加選手')).not.toBeNull();
    expect(screen.getByText('対局実績なし')).not.toBeNull();
    expect(screen.getByText('1名は空席不足のため割り当てられません。')).not.toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'アサインする' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(proposal));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancels without applying the proposal', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <AutoTableAssignmentModal
        isOpen
        proposal={proposal}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables confirmation when there are no available assignments', () => {
    render(
      <AutoTableAssignmentModal
        isOpen
        proposal={{
          tables: [],
          assignmentCount: 0,
          unassignedParticipantIds: ['p1'],
          standingSource: 'competition',
        }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('割り当て可能な参加者または空席がありません。')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'アサインする' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('makes the series history source explicit in the preview', () => {
    render(
      <AutoTableAssignmentModal
        isOpen
        proposal={{ ...proposal, standingSource: 'series' }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/前回までのシリーズ総合成績/)).not.toBeNull();
  });

  it('stays open when applying the proposal fails', async () => {
    const onConfirm = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();

    render(
      <AutoTableAssignmentModal
        isOpen
        proposal={proposal}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'アサインする' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });
});
