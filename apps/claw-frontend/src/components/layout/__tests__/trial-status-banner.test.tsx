import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TrialStatusBanner } from '@/components/layout/trial-status-banner';
import { TrialStatus } from '@/enums/trial-status.enum';

const mockBanner = vi.fn();

vi.mock('@/hooks/layout/use-trial-status-banner', () => ({
  useTrialStatusBanner: () => mockBanner(),
}));

describe('TrialStatusBanner', () => {
  it('renders a persistent upgrade action for an expired trial', () => {
    mockBanner.mockReturnValue({
      status: TrialStatus.EXPIRED,
      title: 'Trial ended',
      body: 'Choose a paid plan to continue.',
      upgradeLabel: 'Upgrade',
      upgradeHref: '/billing',
    });

    render(<TrialStatusBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent('Trial ended');
    expect(screen.getByRole('link', { name: 'Upgrade' })).toHaveAttribute('href', '/billing');
  });

  it('renders nothing when trial status is hidden', () => {
    mockBanner.mockReturnValue({ status: TrialStatus.HIDDEN });
    const { container } = render(<TrialStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
