import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModelDetailPage } from '@/components/observability/pages/model-detail-page';
import { ProviderDetailPage } from '@/components/observability/pages/provider-detail-page';
import { useEntityAuditLatency } from '@/hooks/observability/use-entity-audit-latency';
import { useObservabilityEntityDetail } from '@/hooks/observability/use-observability-entity-detail';

import { modelObsRow, obsDetail, obsHealth, obsRow, scopeContext } from './pages-fixtures';
import { renderInScope } from './pages-test-utils';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined
        ? key
        : `${key}|${Object.entries(params)
            .map(([name, value]) => `${name}=${String(value)}`)
            .join(',')}`,
    locale: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/hooks/observability/use-observability-entity-detail');
vi.mock('@/hooks/observability/use-entity-audit-latency');

const mockDetail = vi.mocked(useObservabilityEntityDetail);
const mockLatency = vi.mocked(useEntityAuditLatency);

function detailState(overrides = {}) {
  return {
    detail: obsDetail(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

const MATCH = {
  key: 'GEMINI',
  label: 'Gemini',
  provider: 'GEMINI',
  model: null,
  requests: 60,
  measuredRequests: 55,
  avgLatencyMs: 900,
  p50LatencyMs: 800,
  p95LatencyMs: 2400,
  totalTokens: 1,
  providerReportedRequests: 1,
  estimatedRequests: 0,
  failureEvents: 3,
  errorRate: 0.05,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDetail.mockReturnValue(detailState());
  mockLatency.mockReturnValue({
    match: MATCH,
    overall: null,
    clamped: false,
    isLoading: false,
    isError: false,
  });
});

describe('ProviderDetailPage', () => {
  it('loads the provider named in the route', () => {
    renderInScope(<ProviderDetailPage provider="LOCAL_OLLAMA" />, scopeContext('period=7d'));
    expect(mockDetail).toHaveBeenCalledWith('LOCAL_OLLAMA', null);
  });

  it('shows the numbers, charts, health, real latency and every split', () => {
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=7d'));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Gemini');
    expect(screen.getByTestId('detail-kpis')).toBeInTheDocument();
    expect(screen.getByTestId('detail-charts')).toBeInTheDocument();
    expect(screen.getByTestId('health-card')).toBeInTheDocument();
    expect(screen.getByTestId('audit-latency-card')).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.detailModels')).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.detailTopUsers')).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.detailPlans')).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.detailSurfaces')).toBeInTheDocument();
  });

  it('links back to the provider list with the period and filters kept', () => {
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=30d&plan=NONE'));
    expect(
      screen.getByRole('link', { name: 'observabilityPages.backToProviders' }),
    ).toHaveAttribute('href', '/observability/providers?period=30d&plan=NONE');
  });

  it('links "View all" to every user of this provider, with the real count', () => {
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=30d'));
    const link = screen.getByRole('link', { name: /observabilityPages\.viewAll/u });
    expect(link).toHaveAttribute('href', '/observability/users?period=30d&provider=GEMINI');
    expect(link).toHaveTextContent('(3)');
  });

  it('opens a top user in the consumption dialog', () => {
    const value = scopeContext('period=7d');
    renderInScope(<ProviderDetailPage provider="GEMINI" />, value);
    fireEvent.click(screen.getByRole('button', { name: /openUser/u }));
    expect(value.openUser).toHaveBeenCalledWith('user-1');
  });

  it('drops a split that has no rows and says when a block hit its cap', () => {
    mockDetail.mockReturnValue(
      detailState({ detail: obsDetail({ plans: [], workflows: [], truncated: true }) }),
    );
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=7d'));
    expect(screen.queryByText('observabilityPages.detailPlans')).not.toBeInTheDocument();
    expect(screen.queryByText('observabilityPages.detailSurfaces')).not.toBeInTheDocument();
    expect(screen.getByText('observabilityPages.detailTruncated')).toBeInTheDocument();
  });

  it('shows a dash instead of rates when the entity carries no health', () => {
    mockDetail.mockReturnValue(
      detailState({ detail: obsDetail({ entity: obsRow({ health: null }) }) }),
    );
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=7d'));
    expect(screen.queryByTestId('health-card')).not.toBeInTheDocument();
  });

  it('shows loading, error with retry, and empty when the provider had no usage', () => {
    mockDetail.mockReturnValue(detailState({ detail: null, isLoading: true }));
    const { rerender } = renderInScope(
      <ProviderDetailPage provider="GEMINI" />,
      scopeContext('period=7d'),
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    const refetch = vi.fn();
    mockDetail.mockReturnValue(detailState({ detail: null, isError: true, refetch }));
    rerender(<ProviderDetailPage provider="GEMINI" />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalled();

    const empty = obsDetail();
    mockDetail.mockReturnValue(
      detailState({
        detail: {
          ...empty,
          entity: { ...empty.entity, metrics: { ...empty.entity.metrics, requests: 0 } },
        },
      }),
    );
    rerender(<ProviderDetailPage provider="GEMINI" />);
    expect(screen.getByText('usageAnalytics.empty')).toBeInTheDocument();
  });
});

describe('ModelDetailPage', () => {
  it('reads the provider and model from the query string, whatever characters the id has', () => {
    mockDetail.mockReturnValue(
      detailState({ detail: obsDetail({ entity: modelObsRow(), providers: [obsRow()] }) }),
    );
    renderInScope(
      <ModelDetailPage />,
      scopeContext('period=7d&provider=OPENAI&model=ft%3Agpt-4o%2Fmini'),
    );
    expect(mockDetail).toHaveBeenCalledWith('OPENAI', 'ft:gpt-4o/mini');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('ft:gpt-4o/mini');
    expect(screen.getByText('observabilityPages.detailProviders')).toBeInTheDocument();
  });

  it('links "View all" to the users of this model, and back to the model list', () => {
    mockDetail.mockReturnValue(detailState({ detail: obsDetail({ entity: modelObsRow() }) }));
    renderInScope(
      <ModelDetailPage />,
      scopeContext('period=7d&provider=OPENAI&model=ft%3Agpt-4o%2Fmini'),
    );
    expect(screen.getByRole('link', { name: /observabilityPages\.viewAll/u })).toHaveAttribute(
      'href',
      '/observability/users?period=7d&provider=OPENAI&model=ft%3Agpt-4o%2Fmini',
    );
    expect(
      screen.getByRole('link', { name: 'observabilityPages.backToModels' }),
    ).toBeInTheDocument();
  });
});

describe('a detail link that names nothing to show', () => {
  it('asks the operator to choose a model instead of rendering a blank page', () => {
    mockDetail.mockReturnValue(detailState({ detail: null }));
    renderInScope(<ModelDetailPage />, scopeContext('period=7d'));
    expect(screen.getByText('observabilityPages.chooseModelTitle')).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.chooseModelHint')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'observabilityPages.backToModels' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('detail-kpis')).not.toBeInTheDocument();
  });

  it('asks for a model when only the provider is in the link', () => {
    mockDetail.mockReturnValue(detailState({ detail: null }));
    renderInScope(<ModelDetailPage />, scopeContext('period=7d&provider=OPENAI'));
    expect(screen.getByText('observabilityPages.chooseModelTitle')).toBeInTheDocument();
  });

  it('asks for a provider on a provider page with no provider', () => {
    mockDetail.mockReturnValue(detailState({ detail: null }));
    renderInScope(<ProviderDetailPage provider="" />, scopeContext('period=7d'));
    expect(screen.getByText('observabilityPages.chooseProviderTitle')).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.chooseProviderHint')).toBeInTheDocument();
  });

  it('shows the detail, not the choice, once the link names a provider and model', () => {
    mockDetail.mockReturnValue(detailState({ detail: obsDetail({ entity: modelObsRow() }) }));
    renderInScope(<ModelDetailPage />, scopeContext('period=7d&provider=OPENAI&model=gpt-x'));
    expect(screen.queryByText('observabilityPages.chooseModelTitle')).not.toBeInTheDocument();
    expect(screen.getByTestId('detail-kpis')).toBeInTheDocument();
  });
});

describe('AuditLatencyCard', () => {
  it('shows the measured latency and failure signals', () => {
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=7d'));
    const card = screen.getByTestId('audit-latency-card');
    expect(within(card).getByText('2,400 ms')).toBeInTheDocument();
    expect(within(card).getByText('900 ms')).toBeInTheDocument();
    expect(within(card).getByText('5.0%')).toBeInTheDocument();
    expect(within(card).getByText('observabilityPages.auditNote')).toBeInTheDocument();
  });

  it('says the audit window is shorter than the period when it was clamped', () => {
    mockLatency.mockReturnValue({
      match: MATCH,
      overall: null,
      clamped: true,
      isLoading: false,
      isError: false,
    });
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=90d'));
    expect(screen.getByText('observabilityPages.auditClamped')).toBeInTheDocument();
  });

  it('says so when there is no data, and when the audit service fails', () => {
    mockLatency.mockReturnValue({
      match: null,
      overall: null,
      clamped: false,
      isLoading: false,
      isError: false,
    });
    const { rerender } = renderInScope(
      <ProviderDetailPage provider="GEMINI" />,
      scopeContext('period=7d'),
    );
    expect(screen.getByText('observabilityPages.auditNone')).toBeInTheDocument();

    mockLatency.mockReturnValue({
      match: null,
      overall: null,
      clamped: false,
      isLoading: false,
      isError: true,
    });
    rerender(<ProviderDetailPage provider="GEMINI" />);
    expect(screen.getByRole('alert')).toHaveTextContent('observabilityPages.auditUnavailable');
  });

  it('shows a dash for a failure count the audit service did not return', () => {
    mockLatency.mockReturnValue({
      match: { ...MATCH, failureEvents: null, errorRate: null },
      overall: null,
      clamped: false,
      isLoading: false,
      isError: false,
    });
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=7d'));
    expect(within(screen.getByTestId('audit-latency-card')).getAllByText('-').length).toBe(2);
  });
});

describe('HealthCard', () => {
  it('states what the rates are not, and warns about stuck reservations', () => {
    mockDetail.mockReturnValue(
      detailState({
        detail: obsDetail({ entity: obsRow({ health: obsHealth({ staleReserved: 4 }) }) }),
      }),
    );
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=7d'));
    const card = screen.getByTestId('health-card');
    expect(within(card).getByText('observabilityPages.healthNote')).toBeInTheDocument();
    expect(
      within(card).getByText('observabilityPages.healthStaleHint|count=4'),
    ).toBeInTheDocument();
  });

  it('shows no stuck-reservation warning when there are none', () => {
    mockDetail.mockReturnValue(
      detailState({
        detail: obsDetail({ entity: obsRow({ health: obsHealth({ staleReserved: 0 }) }) }),
      }),
    );
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=7d'));
    expect(screen.queryByText(/healthStaleHint/u)).not.toBeInTheDocument();
  });
});
