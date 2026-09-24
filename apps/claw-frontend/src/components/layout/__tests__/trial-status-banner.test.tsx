import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TrialStatusBanner } from '@/components/layout/trial-status-banner';
import { TrialBannerDismissalChoice } from '@/enums/trial-banner-dismissal.enum';
import { TrialStatus } from '@/enums/trial-status.enum';

const mockBanner = vi.fn();
const mockDismissal = vi.fn();
const mockDismiss = vi.fn();

vi.mock('@/hooks/layout/use-trial-status-banner', () => ({
  useTrialStatusBanner: () => mockBanner(),
}));
vi.mock('@/hooks/layout/use-trial-banner-dismissal', () => ({
  useTrialBannerDismissal: (days: number | null) => mockDismissal(days),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const activeBanner = {
  status: TrialStatus.ACTIVE,
  title: 'Your free trial is active',
  body: '12 days remaining.',
  upgradeLabel: 'View paid plans',
  upgradeHref: '/billing',
  daysRemaining: 12,
};

describe('TrialStatusBanner', () => {
  beforeEach(() => {
    mockDismiss.mockReset();
    mockDismissal.mockReturnValue({ isSuppressed: false, dismiss: mockDismiss });
  });

  it('renders a persistent upgrade action for an expired trial, with no dismiss control', () => {
    mockBanner.mockReturnValue({
      status: TrialStatus.EXPIRED,
      title: 'Trial ended',
      body: 'Choose a paid plan to continue.',
      upgradeLabel: 'Upgrade',
      upgradeHref: '/billing',
      daysRemaining: 0,
    });

    render(<TrialStatusBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent('Trial ended');
    expect(screen.getByRole('link', { name: 'Upgrade' })).toHaveAttribute('href', '/billing');
    expect(screen.queryByRole('button', { name: 'trialStatus.dismiss' })).toBeNull();
    expect(mockDismissal).toHaveBeenCalledWith(null);
  });

  it('renders nothing when trial status is hidden', () => {
    mockBanner.mockReturnValue({ status: TrialStatus.HIDDEN });
    const { container } = render(<TrialStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the user has it dismissed', () => {
    mockBanner.mockReturnValue(activeBanner);
    mockDismissal.mockReturnValue({ isSuppressed: true, dismiss: mockDismiss });
    const { container } = render(<TrialStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers the three dismiss choices from a labelled keyboard-reachable button', async () => {
    mockBanner.mockReturnValue(activeBanner);
    const user = userEvent.setup();
    render(<TrialStatusBanner />);

    expect(mockDismissal).toHaveBeenCalledWith(12);
    const trigger = screen.getByRole('button', { name: 'trialStatus.dismiss' });
    trigger.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('menuitem', { name: 'trialStatus.remindInOneDay' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'trialStatus.remindInSevenDays' })).toBeVisible();
    await user.click(screen.getByRole('menuitem', { name: 'trialStatus.hideForever' }));
    expect(mockDismiss).toHaveBeenCalledWith(TrialBannerDismissalChoice.HIDE_FOREVER);
  });
});
