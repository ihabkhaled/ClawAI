import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FailuresPage } from '@/components/observability/pages/failures-page';
import { useObservabilityHealth } from '@/hooks/observability/use-observability-health';

import { obsHealth, scopeContext } from './pages-fixtures';
import { renderInScope } from './pages-test-utils';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/observability/use-observability-health');
vi.mock('@/components/observability/explorer/failures-tab', () => ({
  FailuresTab: ({ scope }: { scope: { buildParams: () => unknown } }) => (
    <div data-testid="failures-tab">{JSON.stringify(scope.buildParams())}</div>
  ),
}));

const mockHealth = vi.mocked(useObservabilityHealth);

function healthState(overrides = {}) {
  return {
    report: {
      from: 'a',
      to: 'b',
      generatedAt: 'c',
      overall: obsHealth(),
      byProvider: [
        { key: 'GEMINI', label: 'Gemini', health: obsHealth({ released: 7, refundRate: 0.07 }) },
        { key: 'OPENAI', label: 'OpenAI', health: obsHealth({ released: 2, refundRate: 0.02 }) },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHealth.mockReturnValue(healthState());
});

describe('FailuresPage', () => {
  it('shows the refunded holds first, then the audit failures with the shared scope', () => {
    renderInScope(<FailuresPage />, scopeContext('period=30d&plan=NONE'));
    expect(screen.getByTestId('refunded-holds')).toBeInTheDocument();
    expect(screen.getByTestId('health-card')).toBeInTheDocument();
    expect(screen.getByTestId('failures-tab')).toHaveTextContent('{"days":"30","plan":"NONE"}');
  });

  it('lists the providers that refunded the most, in the order the server gave', () => {
    renderInScope(<FailuresPage />, scopeContext('period=7d'));
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0] as HTMLElement).getByText('Gemini')).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText('7.0%')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('OpenAI')).toBeInTheDocument();
  });

  it('says that refunds are not HTTP errors', () => {
    renderInScope(<FailuresPage />, scopeContext('period=7d'));
    expect(screen.getByText('observabilityPages.refundsNote')).toBeInTheDocument();
  });

  it('says so when nothing was refunded', () => {
    const state = healthState();
    mockHealth.mockReturnValue({ ...state, report: { ...state.report, byProvider: [] } });
    renderInScope(<FailuresPage />, scopeContext('period=7d'));
    expect(screen.getByText('observabilityPages.refundsEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('failures-tab')).toBeInTheDocument();
  });

  it('keeps the audit failures when the ledger part fails, with a retry', () => {
    const refetch = vi.fn();
    mockHealth.mockReturnValue(healthState({ report: null, isError: true, refetch }));
    renderInScope(<FailuresPage />, scopeContext('period=7d'));
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByTestId('failures-tab')).toBeInTheDocument();
  });

  it('shows a loading state for the ledger part only', () => {
    mockHealth.mockReturnValue(healthState({ report: null, isLoading: true }));
    renderInScope(<FailuresPage />, scopeContext('period=7d'));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('failures-tab')).toBeInTheDocument();
  });
});
