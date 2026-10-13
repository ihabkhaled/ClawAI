import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThreadShareMenu } from '../thread-share-menu';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.['platform'] ? `${key}:${params['platform']}` : key,
  }),
}));

const URL_UNDER_TEST = 'https://claw.local/en/threads/vector-search';

describe('ThreadShareMenu', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'share');
  });

  it('links to every network with the address in it, opening safely in a new tab', () => {
    render(<ThreadShareMenu url={URL_UNDER_TEST} title="Vector search" />);

    for (const platform of [
      'WhatsApp',
      'Facebook',
      'LinkedIn',
      'X',
      'Telegram',
      'Reddit',
      'Email',
    ]) {
      const link = screen.getByRole('link', { name: `chat.threadShareOn:${platform}` });
      expect(link.getAttribute('href')).toContain(encodeURIComponent(URL_UNDER_TEST));
      if (platform !== 'Email') {
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      }
    }
  });

  it('copies the link and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<ThreadShareMenu url={URL_UNDER_TEST} title="Vector search" />);

    fireEvent.click(screen.getByRole('button', { name: 'chat.threadShareCopy' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL_UNDER_TEST));
    expect(await screen.findAllByText('chat.threadShareCopied')).not.toHaveLength(0);
  });

  it('tells the person when the clipboard is not available', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<ThreadShareMenu url={URL_UNDER_TEST} title="Vector search" />);

    fireEvent.click(screen.getByRole('button', { name: 'chat.threadShareCopy' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('chat.threadShareCopyFailed');
  });

  it('offers the device share sheet only where the browser has one', () => {
    const { unmount } = render(<ThreadShareMenu url={URL_UNDER_TEST} title="T" />);
    expect(screen.queryByRole('button', { name: 'chat.threadShareNative' })).toBeNull();
    unmount();

    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share });
    render(<ThreadShareMenu url={URL_UNDER_TEST} title="T" />);
    fireEvent.click(screen.getByRole('button', { name: 'chat.threadShareNative' }));

    expect(share).toHaveBeenCalledWith({ title: 'T', url: URL_UNDER_TEST });
  });
});

describe('ThreadShareMenu icon row', () => {
  it('renders each network as an icon-only link with an accessible name and a tooltip', () => {
    render(<ThreadShareMenu url={URL_UNDER_TEST} title="Vector search" />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(7);
    for (const link of links) {
      expect(link.getAttribute('aria-label')).toMatch(/^chat\.threadShareOn:/u);
      expect(link.getAttribute('title')).toBe(link.getAttribute('aria-label'));
      expect(link.querySelector('svg[aria-hidden="true"], svg')).not.toBeNull();
      expect(link.textContent).toBe('');
    }
  });

  it('draws the brand marks as inline SVG that follow the theme colour', () => {
    render(<ThreadShareMenu url={URL_UNDER_TEST} title="Vector search" />);

    for (const platform of ['Facebook', 'LinkedIn', 'X', 'Reddit']) {
      const svg = screen
        .getByRole('link', { name: `chat.threadShareOn:${platform}` })
        .querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('fill')).toBe('currentColor');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('uses logical spacing and touch-sized buttons so it mirrors in right-to-left', () => {
    render(<ThreadShareMenu url={URL_UNDER_TEST} title="Vector search" />);

    const copy = screen.getByRole('button', { name: 'chat.threadShareCopy' });
    expect(copy.className).toContain('ms-auto');
    expect(copy.className).not.toMatch(/(^|\s)(ml|mr|pl|pr)-/u);
    expect(screen.getAllByRole('link')[0]?.className).toContain('h-10');
  });
});
