import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher';

vi.mock('@/hooks/marketing/use-marketing-locale-switcher', () => ({
  useMarketingLocaleSwitcher: () => ({
    locale: 'en',
    options: [{ locale: 'en', label: 'English' }],
    handleLocaleChange: vi.fn(),
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: () => 'Select language' }),
}));

describe('MarketingLocaleSwitcher', () => {
  it('includes its visible language in the accessible name', () => {
    render(<MarketingLocaleSwitcher />);

    expect(screen.getByRole('button', { name: 'English, Select language' })).toHaveTextContent(
      'English',
    );
  });
});
