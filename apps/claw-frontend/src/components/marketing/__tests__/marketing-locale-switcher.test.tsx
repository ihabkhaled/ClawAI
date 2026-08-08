import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher';

const mockState = vi.hoisted(() => ({ isPending: false }));

vi.mock('@/hooks/marketing/use-marketing-locale-switcher', () => ({
  useMarketingLocaleSwitcher: () => ({
    locale: 'en',
    options: [{ locale: 'en', label: 'English' }],
    handleLocaleChange: vi.fn(),
    isPending: mockState.isPending,
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: () => 'Select language' }),
}));

describe('MarketingLocaleSwitcher', () => {
  it('includes its visible language in the accessible name', () => {
    mockState.isPending = false;
    render(<MarketingLocaleSwitcher />);

    expect(screen.getByRole('button', { name: 'English, Select language' })).toHaveTextContent(
      'English',
    );
  });

  it('disables language selection and covers the page while navigation is pending', () => {
    mockState.isPending = true;
    render(<MarketingLocaleSwitcher />);

    expect(screen.getByRole('button', { name: 'English, Select language' })).toBeDisabled();
    expect(screen.getByRole('status', { name: 'Select language' })).toBeInTheDocument();
  });
});
