import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingMobileMenu } from '@/components/marketing/marketing-mobile-menu';
import { AUTH_INITIAL_STATE } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';
import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';

vi.mock('@/hooks/auth/use-logout', () => ({
  useLogout: () => ({ logout: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
}));
vi.mock('@/components/common/currency-switcher', () => ({ CurrencySwitcher: () => <div /> }));
vi.mock('@/components/marketing/marketing-locale-switcher', () => ({
  MarketingLocaleSwitcher: () => <div />,
}));
vi.mock('@/components/marketing/marketing-theme-toggle', () => ({
  MarketingThemeToggle: () => <div />,
}));

const footerProps = {
  explorePages: [],
  featurePages: [],
  comparisons: [],
  comparisonsHeading: 'c',
};

describe('marketing feedback entries open the one dialog', () => {
  beforeEach(() => {
    useFeedbackDialogStore.setState({ isOpen: false });
    useAuthStore.setState(AUTH_INITIAL_STATE);
  });

  it('header', async () => {
    render(<MarketingHeader />);

    await userEvent.click(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' }));

    expect(useFeedbackDialogStore.getState().isOpen).toBe(true);
  });

  it('footer', async () => {
    render(<MarketingFooter {...footerProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' }));

    expect(useFeedbackDialogStore.getState().isOpen).toBe(true);
  });

  it('mobile menu closes itself and opens feedback', async () => {
    const onNavigate = vi.fn();
    render(
      <MarketingMobileMenu navLinks={[]} isOpen onOpenChange={vi.fn()} onNavigate={onNavigate} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(useFeedbackDialogStore.getState().isOpen).toBe(true);
  });

  it('mobile menu shows Chat instead of Register / Sign in for a signed-in user', () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 't', refreshToken: 'r' });
    render(
      <MarketingMobileMenu navLinks={[]} isOpen onOpenChange={vi.fn()} onNavigate={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: 'nav.chat' })).toHaveAttribute('href', '/chat');
    expect(screen.queryByRole('link', { name: 'marketing.header.createAccount' })).toBeNull();
  });
});
