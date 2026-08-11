// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import { ShareCompetitionSeriesModal } from './ShareCompetitionSeriesModal';

afterEach(() => cleanup());

describe('ShareCompetitionSeriesModal', () => {
  it('renders a QR code target and join URL for the series', () => {
    render(
      <SnackbarProvider>
        <ShareCompetitionSeriesModal isOpen onClose={() => undefined} seriesId="series-123" />
      </SnackbarProvider>,
    );

    expect(screen.getByText('大会シリーズを共有')).not.toBeNull();
    expect(
      screen.getByText((content) =>
        content.includes(`${window.location.origin}/competition-series/series-123/join`),
      ),
    ).not.toBeNull();
  });
});
