// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import { ShareCompetitionModal } from './ShareCompetitionModal';

afterEach(() => {
  cleanup();
});

describe('ShareCompetitionModal', () => {
  it('renders the competition join URL when opened', () => {
    render(
      <SnackbarProvider>
        <ShareCompetitionModal isOpen onClose={() => undefined} competitionId="comp-123" />
      </SnackbarProvider>,
    );

    expect(screen.getByText('大会を共有')).not.toBeNull();
    expect(
      screen.getByText((content) =>
        content.includes(`${window.location.origin}/competitions/comp-123/join`),
      ),
    ).not.toBeNull();
  });
});
