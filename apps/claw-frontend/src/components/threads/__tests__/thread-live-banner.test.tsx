import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/lib/i18n/locales/en';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';

import { ThreadLiveBanner } from '../thread-live-banner';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => resolveTranslation(en, key, params),
  }),
}));

const LIVE_URL = 'https://claw.local/threads/clear-writing';

describe('ThreadLiveBanner', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('announces the Thread is live in plain words, with no raw translation keys', () => {
    render(<ThreadLiveBanner url={LIVE_URL} />);

    const banner = screen.getByTestId('thread-live-banner');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveTextContent('Your Thread is live');
    expect(banner.textContent).not.toMatch(/chat\./u);
  });

  it('shows the address in a read-only field and opens it in a new tab without navigating', () => {
    render(<ThreadLiveBanner url={LIVE_URL} />);

    const field = screen.getByLabelText('Public link');
    expect(field).toHaveValue(LIVE_URL);
    expect(field).toHaveAttribute('readonly');
    const open = screen.getByRole('link', { name: 'Open live Thread' });
    expect(open).toHaveAttribute('href', LIVE_URL);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('copies the link and says it was copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<ThreadLiveBanner url={LIVE_URL} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(LIVE_URL));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
  });

  it('tells the person when the clipboard refuses', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<ThreadLiveBanner url={LIVE_URL} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy');
  });

  it('gives both actions a touch-sized, full-width layout on a phone', () => {
    render(<ThreadLiveBanner url={LIVE_URL} />);

    expect(screen.getByRole('link', { name: 'Open live Thread' }).className).toContain('w-full');
    expect(screen.getByRole('button', { name: 'Copy link' }).className).toContain('w-full');
  });
});
