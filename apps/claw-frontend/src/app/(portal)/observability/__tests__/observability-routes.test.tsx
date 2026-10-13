import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ObservabilityConsumptionPage from '@/app/(portal)/observability/consumption/page';
import ObservabilityFailuresPage from '@/app/(portal)/observability/failures/page';
import ObservabilityLayout from '@/app/(portal)/observability/layout';
import ObservabilityModelDetailPage from '@/app/(portal)/observability/models/detail/page';
import ObservabilityModelsPage from '@/app/(portal)/observability/models/page';
import ObservabilityPage from '@/app/(portal)/observability/page';
import ObservabilityPlansPage from '@/app/(portal)/observability/plans/page';
import ObservabilityProviderDetailPage from '@/app/(portal)/observability/providers/[provider]/page';
import ObservabilityProvidersPage from '@/app/(portal)/observability/providers/page';
import ObservabilitySurfacesPage from '@/app/(portal)/observability/surfaces/page';
import ObservabilityTracingPage from '@/app/(portal)/observability/tracing/page';
import ObservabilityUsersPage from '@/app/(portal)/observability/users/page';

let mockProvider = 'GEMINI';

vi.mock('next/navigation', () => ({
  useParams: () => ({ provider: mockProvider }),
}));
vi.mock('@/components/observability/pages/observability-shell', () => ({
  ObservabilityShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));
vi.mock('@/components/observability/pages/observability-hub', () => ({
  ObservabilityHub: () => <div>hub</div>,
}));
vi.mock('@/components/observability/pages/users-page', () => ({
  UsersPage: () => <div>users</div>,
}));
vi.mock('@/components/observability/pages/providers-page', () => ({
  ProvidersPage: () => <div>providers</div>,
}));
vi.mock('@/components/observability/pages/provider-detail-page', () => ({
  ProviderDetailPage: ({ provider }: { provider: string }) => <div>provider-detail:{provider}</div>,
}));
vi.mock('@/components/observability/pages/models-page', () => ({
  ModelsPage: () => <div>models</div>,
}));
vi.mock('@/components/observability/pages/model-detail-page', () => ({
  ModelDetailPage: () => <div>model-detail</div>,
}));
vi.mock('@/components/observability/pages/plans-page', () => ({
  PlansPage: () => <div>plans</div>,
}));
vi.mock('@/components/observability/pages/surfaces-page', () => ({
  SurfacesPage: () => <div>surfaces</div>,
}));
vi.mock('@/components/observability/pages/consumption-page', () => ({
  ConsumptionPage: () => <div>consumption</div>,
}));
vi.mock('@/components/observability/pages/tracing-page', () => ({
  TracingPage: () => <div>tracing</div>,
}));
vi.mock('@/components/observability/pages/failures-page', () => ({
  FailuresPage: () => <div>failures</div>,
}));

describe('observability routes', () => {
  it('wraps every page in the shared frame', () => {
    render(
      <ObservabilityLayout>
        <span>inside</span>
      </ObservabilityLayout>,
    );
    expect(screen.getByTestId('shell')).toHaveTextContent('inside');
  });

  it.each([
    [ObservabilityPage, 'hub'],
    [ObservabilityUsersPage, 'users'],
    [ObservabilityProvidersPage, 'providers'],
    [ObservabilityModelsPage, 'models'],
    [ObservabilityModelDetailPage, 'model-detail'],
    [ObservabilityPlansPage, 'plans'],
    [ObservabilitySurfacesPage, 'surfaces'],
    [ObservabilityConsumptionPage, 'consumption'],
    [ObservabilityTracingPage, 'tracing'],
    [ObservabilityFailuresPage, 'failures'],
  ] as const)('route %o renders %s', (Page, text) => {
    render(<Page />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('decodes the provider code from the path, and survives a malformed escape', () => {
    mockProvider = 'LOCAL%20OLLAMA';
    render(<ObservabilityProviderDetailPage />);
    expect(screen.getByText('provider-detail:LOCAL OLLAMA')).toBeInTheDocument();
    mockProvider = 'BAD%';
    render(<ObservabilityProviderDetailPage />);
    expect(screen.getByText('provider-detail:BAD%')).toBeInTheDocument();
  });
});
