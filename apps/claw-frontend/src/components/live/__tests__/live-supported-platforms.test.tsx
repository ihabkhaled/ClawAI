import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LiveSupportedPlatforms } from '@/components/live/live-supported-platforms';
import { LIVE_MARKETING_PLATFORMS } from '@/constants/live-intelligence-marketing-platforms.constants';
import { LIVE_TRANSLATIONS } from '@/lib/i18n/locales/live-translations';

/** The real English dictionary with {placeholders}, so a wrong key shows as a raw key. */
function t(key: string, params?: Record<string, string | number>): string {
  let node: unknown = { live: LIVE_TRANSLATIONS.en };
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof node !== 'string') {
    return key;
  }
  return node.replaceAll(/\{(\w+)\}/gu, (_match, name: string) => String(params?.[name] ?? ''));
}

describe('LiveSupportedPlatforms', () => {
  it('lists every platform of the public list, with live and video counts', () => {
    render(<LiveSupportedPlatforms t={t} />);
    const list = screen.getByTestId('live-supported-platforms');
    const live = LIVE_MARKETING_PLATFORMS.filter((platform) => platform.live).length;
    const videos = LIVE_MARKETING_PLATFORMS.filter((platform) => platform.recorded).length;
    expect(within(list).getByText(`${String(live)} live · ${String(videos)} video`)).toBeTruthy();
    expect(within(list).getAllByRole('listitem')).toHaveLength(LIVE_MARKETING_PLATFORMS.length);
    for (const platform of LIVE_MARKETING_PLATFORMS) {
      expect(within(list).getByText(platform.name)).toBeTruthy();
    }
    expect(list.textContent).not.toContain('live.platform.');
  });
});
