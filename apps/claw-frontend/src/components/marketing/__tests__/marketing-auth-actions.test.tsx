import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketingAuthActions } from '@/components/marketing/marketing-auth-actions';
import { AUTH_INITIAL_STATE } from '@/constants';
import { MarketingAuthActionsVariant } from '@/enums';
import { useAuthStore } from '@/stores/auth.store';

const logoutMock = vi.fn(() => {
  useAuthStore.getState().clearAuth();
});

vi.mock('@/hooks/auth/use-logout', () => ({
  useLogout: () => ({ logout: logoutMock, isPending: false }),
}));

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const signIn = (): void => {
  useAuthStore.setState({ isAuthenticated: true, accessToken: 'token', refreshToken: 'refresh' });
};

describe('MarketingAuthActions', () => {
  beforeEach(() => {
    useAuthStore.setState(AUTH_INITIAL_STATE);
    logoutMock.mockClear();
  });

  it('desktop, signed out: Sign in and Register, no Chat', () => {
    render(<MarketingAuthActions variant={MarketingAuthActionsVariant.DESKTOP} />);

    expect(screen.getByRole('link', { name: 'marketing.header.login' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: 'marketing.header.createAccount' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'nav.chat' })).toBeNull();
  });

  it('desktop, signed in: Chat links to /chat and the signed-out pair only reserves width', () => {
    signIn();
    render(<MarketingAuthActions variant={MarketingAuthActionsVariant.DESKTOP} />);

    expect(screen.getByRole('link', { name: 'nav.chat' })).toHaveAttribute('href', '/chat');
    expect(screen.queryByRole('link', { name: 'marketing.header.login' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'marketing.header.createAccount' })).toBeNull();
  });

  it('mobile, signed out: Sign in and Register', () => {
    render(<MarketingAuthActions variant={MarketingAuthActionsVariant.MOBILE} />);

    expect(screen.getByRole('link', { name: 'marketing.header.login' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'marketing.header.createAccount' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'nav.chat' })).toBeNull();
  });

  it('mobile, signed in: only Chat', () => {
    signIn();
    render(<MarketingAuthActions variant={MarketingAuthActionsVariant.MOBILE} />);

    expect(screen.getByRole('link', { name: 'nav.chat' })).toHaveAttribute('href', '/chat');
    expect(screen.queryByRole('link', { name: 'marketing.header.login' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'marketing.header.createAccount' })).toBeNull();
  });

  it('swaps when the session appears after render', () => {
    render(<MarketingAuthActions variant={MarketingAuthActionsVariant.MOBILE} />);
    expect(screen.getByRole('link', { name: 'marketing.header.login' })).toBeInTheDocument();

    act(() => signIn());

    expect(screen.getByRole('link', { name: 'nav.chat' })).toBeInTheDocument();
  });

  it.each([MarketingAuthActionsVariant.DESKTOP, MarketingAuthActionsVariant.MOBILE])(
    '%s: Log out shows only when signed in',
    (variant) => {
      const { unmount } = render(<MarketingAuthActions variant={variant} />);
      expect(screen.queryByRole('button', { name: 'auth.logout' })).toBeNull();
      unmount();

      signIn();
      render(<MarketingAuthActions variant={variant} />);
      expect(screen.getByRole('button', { name: 'auth.logout' })).toBeInTheDocument();
    },
  );

  it('clicking Log out calls the shared logout and the navbar returns to signed-out', () => {
    signIn();
    render(<MarketingAuthActions variant={MarketingAuthActionsVariant.MOBILE} />);

    fireEvent.click(screen.getByRole('button', { name: 'auth.logout' }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'marketing.header.login' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'nav.chat' })).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  // The static HTML (what a crawler reads) must be the signed-out version even
  // when a session exists in the store.
  it('server render is the signed-out markup regardless of the stored session', () => {
    signIn();
    const html = renderToString(
      <MarketingAuthActions variant={MarketingAuthActionsVariant.DESKTOP} />,
    );

    expect(html).toContain('marketing.header.login');
    expect(html).toContain('marketing.header.createAccount');
    expect(html).not.toContain('nav.chat');
    expect(html).not.toContain('invisible');
  });
});
