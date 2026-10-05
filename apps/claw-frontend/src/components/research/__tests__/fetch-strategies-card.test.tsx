import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FetchStrategiesCard } from '@/components/research/fetch-strategies-card';

const hook = vi.hoisted(() => ({ useFetchStrategies: vi.fn() }));

vi.mock('@/hooks/research/use-fetch-strategies', () => hook);
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('FetchStrategiesCard', () => {
  beforeEach(() => {
    hook.useFetchStrategies.mockReset();
  });

  it('shows each tier as Available or Off, in tier order', () => {
    hook.useFetchStrategies.mockReturnValue({
      strategies: [
        { kind: 'CRAWL4AI', enabled: false, tier: 40 },
        { kind: 'HTTP_PLAIN', enabled: true, tier: 10 },
      ],
      isLoading: false,
      isError: false,
    });

    render(<FetchStrategiesCard />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('narration.strategyHttpPlain');
    expect(items[0]).toHaveTextContent('narration.strategyAvailable');
    expect(items[1]).toHaveTextContent('narration.strategyCrawl4ai');
    expect(items[1]).toHaveTextContent('narration.strategyOff');
  });

  it('renders nothing when the list is unavailable (non-admin or error)', () => {
    hook.useFetchStrategies.mockReturnValue({ strategies: [], isLoading: false, isError: true });
    const { container } = render(<FetchStrategiesCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
