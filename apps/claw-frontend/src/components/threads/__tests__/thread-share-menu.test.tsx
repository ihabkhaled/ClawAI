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
