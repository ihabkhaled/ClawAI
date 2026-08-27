import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PortalShell } from '@/components/layout/portal-shell';

const mockAuthGuard = vi.fn();

vi.mock('@/hooks/auth/use-auth-guard', () => ({
  useAuthGuard: () => mockAuthGuard(),
}));
vi.mock('@/hooks/layout/use-layout-shortcuts', () => ({ useLayoutShortcuts: () => {} }));
vi.mock('@/hooks/settings/use-preference-bootstrap', () => ({ usePreferenceBootstrap: () => {} }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/layout/sidebar', () => ({ Sidebar: () => <nav data-testid="sidebar" /> }));
vi.mock('@/components/layout/topbar', () => ({ Topbar: () => <div data-testid="topbar" /> }));
vi.mock('@/components/layout/trial-status-banner', () => ({
  TrialStatusBanner: () => <div data-testid="trial-banner" />,
}));
// The rotation banner owns a router-dependent guard; this suite renders the
// shell outside an app router, so it is stubbed like every other banner here.
vi.mock('@/components/layout/password-rotation-banner', () => ({
  PasswordRotationBanner: () => <div data-testid="password-rotation-banner" />,
}));
vi.mock('@/components/layout/mobile-bottom-nav', () => ({
  MobileBottomNav: () => <div data-testid="mobile-nav" />,
}));
vi.mock('@/components/layout/skip-to-content', () => ({
  SkipToContent: () => (
    <a data-testid="skip-link" href="#main-content">
      skip
    </a>
  ),
}));
vi.mock('@/components/layout/portal-content', () => ({
  PortalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/common/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PortalShell (regression: behavior-preserving extraction from the old client layout)', () => {
  it('renders a loading state while the auth guard is not ready', () => {
    mockAuthGuard.mockReturnValue({ isReady: false });
    render(
      <PortalShell>
        <div>page content</div>
      </PortalShell>,
    );
    expect(screen.getByText('auth.authenticating')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });

  it('renders the full shell and children once the auth guard is ready', () => {
    mockAuthGuard.mockReturnValue({ isReady: true });
    render(
      <PortalShell>
        <div>page content</div>
      </PortalShell>,
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
    // Order matters: the rotation banner is a hard stop (the account cannot use
    // the product until the password is replaced), so it sits above the trial
    // banner, which is informational.
    expect(screen.getByTestId('topbar').nextElementSibling).toBe(
      screen.getByTestId('password-rotation-banner'),
    );
    expect(screen.getByTestId('password-rotation-banner').nextElementSibling).toBe(
      screen.getByTestId('trial-banner'),
    );
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
    expect(screen.getByTestId('skip-link')).toBeInTheDocument();
    expect(screen.getByText('page content')).toBeInTheDocument();
  });
});
