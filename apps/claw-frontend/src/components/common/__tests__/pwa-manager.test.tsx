import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PwaManager } from '@/components/common/pwa-manager';

// Regression: the chat page pins a floating "new chat" action button to the
// same bottom-end corner (fixed, end-4, see (portal)/chat/page.tsx), and this
// banner has the highest z-index in the app. A symmetric mobile inset here
// used to span underneath that button and swallow every tap meant for it.
// This constant is the reserved end-side gap (`end-20` = 5rem) the banner
// must keep on mobile so it never reoccupies that corner.
const FAB_CLEARANCE_CLASS = 'end-20';

// Regression: PwaManager used to render four hardcoded English strings
// ("You are offline...", "A new ClawAI version is available.", "Install
// ClawAI for app-like access.", plus the Update/Install labels and the
// "Dismiss install prompt" aria-label) instead of calling t(). Every other
// surface in the app is localized into 13 locales, so this banner silently
// showed English text on Arabic, German, French, etc. pages -- including on
// mobile, where it sits pinned above the bottom navigation and is the most
// visible chrome on the screen. These tests assert the component reads its
// copy from the translation dictionary (mocked here to echo the key back),
// so a future contributor cannot reintroduce a literal string without a
// visible test failure.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

describe('PwaManager', () => {
  const originalOnLine = window.navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
    });
    vi.restoreAllMocks();
  });

  it('renders nothing when online, with no install prompt and no pending update', () => {
    const { container } = render(<PwaManager />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the translated offline message when the browser is offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<PwaManager />);

    expect(screen.getByText('pwa.offlineMessage')).toBeInTheDocument();
    // The literal English copy must never appear -- it belongs behind t().
    expect(screen.queryByText(/you are offline/i)).toBeNull();
  });

  it('keeps its mobile footprint clear of the chat page bottom-end floating action button', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<PwaManager />);

    const banner = screen.getByText('pwa.offlineMessage').closest('.fixed');
    expect(banner).toHaveClass(FAB_CLEARANCE_CLASS);
    // A plain symmetric inset would span back under the FAB corner this was
    // written to avoid.
    expect(banner).not.toHaveClass('inset-x-2');
  });

  it('shows a translated install prompt and lets the user install or dismiss it', async () => {
    const user = userEvent.setup();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: 'accepted' });

    render(<PwaManager />);

    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = userChoice;
    window.dispatchEvent(installEvent);

    expect(await screen.findByText('pwa.installMessage')).toBeInTheDocument();
    expect(screen.queryByText(/install clawai for app-like access/i)).toBeNull();

    const installButton = screen.getByRole('button', { name: 'pwa.installAction' });
    expect(installButton).toBeInTheDocument();

    await user.click(installButton);
    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('pwa.installMessage')).toBeNull());

    // Re-fire the prompt to exercise the dismiss path independently.
    window.dispatchEvent(installEvent);
    await screen.findByText('pwa.installMessage');
    const dismissButton = screen.getByRole('button', { name: 'pwa.neverShowAgain' });
    await user.click(dismissButton);
    expect(screen.queryByText('pwa.installMessage')).toBeNull();
  });
});
