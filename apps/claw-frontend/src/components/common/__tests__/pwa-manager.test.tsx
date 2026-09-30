import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PwaManager } from '@/components/common/pwa-manager';
import { APP_VERSION } from '@/constants';
import { PWA_INSTALL_DISMISSED_KEY } from '@/constants/pwa.constants';
import { appVersionRepository } from '@/repositories/app-version/app-version.repository';

vi.mock('@/repositories/app-version/app-version.repository', () => ({
  appVersionRepository: { deployed: vi.fn() },
}));

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
    window.localStorage.clear();
    vi.mocked(appVersionRepository.deployed).mockResolvedValue(APP_VERSION);
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

  // Regression: a Radix modal sets `pointer-events: none` on <body> while it
  // is open. This banner outranks every dialog at z-[120] and paints over one,
  // so without an explicit opt-in it was visible, on top, and completely
  // unclickable -- the user could not dismiss it without closing the dialog.
  it('stays clickable while a modal dialog holds the page', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<PwaManager />);

    const banner = screen.getByText('pwa.offlineMessage').closest('.fixed');
    expect(banner).toHaveClass('pointer-events-auto');
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

  // `.safe-bottom` assigns padding-bottom, so it beats the card's `p-5` and
  // collapsed the bottom padding to the safe-area inset — 0px on desktop. The
  // buttons sat flush against the border while every other edge had air.
  it('pairs safe-bottom with a base so the card keeps its bottom padding', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<PwaManager />);

    const banner = screen.getByText('pwa.offlineMessage').closest('.fixed');
    expect(banner).toHaveClass('safe-bottom');
    expect(banner).toHaveClass('safe-bottom-base-5');
  });

  // The close control used to carry a negative inline-end margin, which pulled
  // it flush against the card edge with no padding around it at all.
  it('keeps the dismiss control inside the card padding', async () => {
    render(<PwaManager />);

    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    installEvent.prompt = vi.fn(async () => undefined);
    installEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(installEvent);

    await screen.findByText('pwa.installMessage');

    expect(screen.getByRole('button', { name: 'pwa.neverShowAgain' }).className).not.toContain(
      '-me-',
    );
  });

  // The close control is "never show again", not "hide for now": the choice is
  // persisted, so a reload must not put the prompt back in front of someone who
  // already declined it.
  it('persists the dismissal and stays gone on a later render', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PwaManager />);

    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    installEvent.prompt = vi.fn(async () => undefined);
    installEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(installEvent);

    await screen.findByText('pwa.installMessage');
    await user.click(screen.getByRole('button', { name: 'pwa.neverShowAgain' }));

    expect(window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)).toBe('true');

    unmount();
    render(<PwaManager />);
    window.dispatchEvent(installEvent);

    await waitFor(() => expect(screen.queryByText('pwa.installMessage')).toBeNull());
  });
});

// Reported 2026-09-20 and again 2026-09-29: a tab left open never showed the
// banner after a deploy, and a freshly reloaded page (already current) showed
// it anyway — even after Update. The banner now means exactly "the server runs
// a later release than this page", so both halves are covered here.
describe('PwaManager update offer', () => {
  const [major, minor, patch] = APP_VERSION.split('.').map(Number);
  const NEWER = `${major}.${minor}.${(patch ?? 0) + 1}`;
  const OLDER = `${major}.${minor}.${Math.max((patch ?? 0) - 1, 0)}`;
  const deployed = vi.mocked(appVersionRepository.deployed);
  const reload = vi.fn();
  const originalLocation = window.location;

  function installServiceWorkerMock(waiting: { postMessage: () => void } | null) {
    const registration = { waiting, update: vi.fn(), addEventListener: vi.fn() };
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue(registration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getRegistrations: vi.fn().mockResolvedValue([]),
        controller: {},
      },
    });
    return registration;
  }

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    window.localStorage.clear();
    reload.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });
  });

  afterEach(() => {
    // Unmount BEFORE the mock is removed: effect cleanups run in cleanup().
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    deployed.mockReset();
    Reflect.deleteProperty(window.navigator, 'serviceWorker');
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('shows the banner while the server runs a later release than the page', async () => {
    deployed.mockResolvedValue(NEWER);
    installServiceWorkerMock(null);
    render(<PwaManager />);
    expect(await screen.findByText('pwa.updateAvailable')).toBeInTheDocument();
  });

  it('stays hidden on a page that is already the deployed version, even with a worker waiting', async () => {
    // The reload half of the bug: the reloaded page installs a new worker,
    // which waits — and the banner used to read that as "out of date".
    deployed.mockResolvedValue(APP_VERSION);
    installServiceWorkerMock({ postMessage: vi.fn() });
    const { container } = render(<PwaManager />);
    await waitFor(() => expect(deployed).toHaveBeenCalled());
    expect(container.textContent).not.toContain('pwa.updateAvailable');
  });

  it('stays hidden when the page is newer than the server (mid-rollout)', async () => {
    deployed.mockResolvedValue(OLDER);
    installServiceWorkerMock(null);
    const { container } = render(<PwaManager />);
    await waitFor(() => expect(deployed).toHaveBeenCalled());
    expect(container.textContent).not.toContain('pwa.updateAvailable');
  });

  it('stays hidden when the server cannot say which version it runs', async () => {
    deployed.mockResolvedValue(null);
    installServiceWorkerMock(null);
    const { container } = render(<PwaManager />);
    await waitFor(() => expect(deployed).toHaveBeenCalled());
    expect(container.textContent).not.toContain('pwa.updateAvailable');
  });

  it('notices a deploy while the tab stays open, without a reload', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    deployed.mockResolvedValue(APP_VERSION);
    installServiceWorkerMock(null);
    render(<PwaManager />);
    await waitFor(() => expect(deployed).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('pwa.updateAvailable')).toBeNull();

    deployed.mockResolvedValue(NEWER);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(await screen.findByText('pwa.updateAvailable')).toBeInTheDocument();
  });

  it('Update hides the banner, hands over to a waiting worker, and reloads', async () => {
    const user = userEvent.setup();
    deployed.mockResolvedValue(NEWER);
    const postMessage = vi.fn();
    installServiceWorkerMock({ postMessage });
    render(<PwaManager />);
    await screen.findByText('pwa.updateAvailable');
    // Let the registration promise settle so the worker handle is known.
    await waitFor(() => expect(window.navigator.serviceWorker.register).toHaveBeenCalled());
    await Promise.resolve();

    await user.click(screen.getByRole('button', { name: 'pwa.updateAction' }));

    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('pwa.updateAvailable')).toBeNull();
  });
});
