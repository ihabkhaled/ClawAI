import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelRosterSection } from '@/components/marketing/home/model-roster-section';
import { MARKETING_NEWEST_MODELS } from '@/constants/subscription-marketing.constants';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ModelRosterSection', () => {
  it('renders the concise canonical newest-model roster responsively', () => {
    render(<ModelRosterSection />);

    const list = screen.getByRole('list', { name: 'marketing.home.modelRoster.newestTitle' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(MARKETING_NEWEST_MODELS.length);
    for (const model of MARKETING_NEWEST_MODELS) {
      expect(within(list).getByText(model.label)).toBeInTheDocument();
    }
    expect(list).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4');
  });
});
