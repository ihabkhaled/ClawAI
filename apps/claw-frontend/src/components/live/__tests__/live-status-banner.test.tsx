import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LiveStatusBanner } from '@/components/live/live-status-banner';
import { LIVE_STATUS_PRESENTATION } from '@/constants/live.constants';
import { LiveStatusCode } from '@/enums/live.enum';
import { LIVE_TRANSLATIONS } from '@/lib/i18n/locales/live-translations';

/** Resolves `live.*` keys against the real English dictionary, so a wrong key shows as a raw key. */
function t(key: string): string {
  const path = key.split('.');
  let node: unknown = { live: LIVE_TRANSLATIONS.en };
  for (const part of path) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  return typeof node === 'string' ? node : key;
}

describe('LiveStatusBanner', () => {
  it.each(Object.values(LiveStatusCode))('renders its own translated text for %s', (status) => {
    render(<LiveStatusBanner status={status} isReconnecting={false} isLost={false} t={t} />);
    const banner = screen.getByTestId(`live-status-${status}`);
    const presentation = LIVE_STATUS_PRESENTATION[status];
    expect(banner).toHaveTextContent(t(presentation.titleKey));
    expect(banner).toHaveTextContent(t(presentation.descriptionKey));
    expect(banner.textContent).not.toContain('live.status.');
  });

  it('gives every status a distinct title (no shared fake success text)', () => {
    const titles = Object.values(LiveStatusCode).map((status) =>
      t(LIVE_STATUS_PRESENTATION[status].titleKey),
    );
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('adds the connection state when the feed is reconnecting or lost', () => {
    const { rerender } = render(
      <LiveStatusBanner status={LiveStatusCode.ANALYZING} isReconnecting isLost={false} t={t} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(t('live.modal.reconnecting'));
    rerender(<LiveStatusBanner status={LiveStatusCode.ANALYZING} isReconnecting isLost t={t} />);
    expect(screen.getByRole('status')).toHaveTextContent(t('live.modal.connectionLost'));
  });
});
