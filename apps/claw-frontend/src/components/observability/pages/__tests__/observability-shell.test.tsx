import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityShell } from '@/components/observability/pages/observability-shell';
import { NO_PAGE_FILTER_OPTIONS } from '@/constants/observability-pages.constants';
import { Permission } from '@/enums/permission.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';

const mockReplace = vi.fn();
let mockQuery = '';
let mockPath = '/observability';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockQuery),
  usePathname: () => mockPath,
  useRouter: () => ({ replace: mockReplace }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/auth/use-permissions');
vi.mock('@/hooks/observability/use-observability-filter-options', () => ({
  useObservabilityFilterOptions: () => NO_PAGE_FILTER_OPTIONS,
}));
vi.mock('@/components/observability/legacy-observability', () => ({
  LegacyObservability: () => <div>legacy-observability</div>,
}));
vi.mock('@/components/observability/open-grafana-button', () => ({
  OpenGrafanaButton: () => null,
}));
vi.mock('@/components/observability/explorer/user-consumption-dialog', () => ({
  UserConsumptionDialog: ({ userId, onClose }: { userId: string | null; onClose: () => void }) => (
    <div data-testid="user-dialog">
      {userId ?? 'closed'}
      <button type="button" onClick={onClose}>
        close-dialog
      </button>
    </div>
  ),
}));

const mockPermissions = vi.mocked(usePermissions);

function grant(...allowed: Permission[]): void {
  mockPermissions.mockReturnValue({
    isAdmin: true,
    isSuperAdmin: false,
    can: (permission) => allowed.includes(permission),
    canAny: () => false,
  });
}

function Child(): React.ReactElement {
  const { state, scope } = useObservabilityScope();
  return (
    <div data-testid="child">
      {state.period}|{JSON.stringify(scope.buildParams())}
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery = '';
  mockPath = '/observability';
});

describe('ObservabilityShell', () => {
  it('frames the page with the title, navigation, filters and the page itself', () => {
    grant(Permission.ADMIN_USAGE_VIEW, Permission.ADMIN_SYSTEM_VIEW);
    render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('observability.title');
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(
      screen.getByRole('form', { name: 'observabilityPages.filtersLabel' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'observabilityPages.navFailures' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('legacy-observability')).not.toBeInTheDocument();
  });

  it('hides the provider and model filters on a provider page, which ignores them', () => {
    grant(Permission.ADMIN_USAGE_VIEW);
    mockPath = '/observability/providers/GEMINI';
    render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(screen.queryByLabelText('observabilityExplorer.filterProvider')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('observabilityExplorer.filterModel')).not.toBeInTheDocument();
    expect(screen.getByLabelText('observabilityPages.filterPlan')).toBeInTheDocument();
  });

  it('keeps the provider and model filters on the list pages', () => {
    grant(Permission.ADMIN_USAGE_VIEW);
    mockPath = '/observability/models';
    render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(screen.getByLabelText('observabilityExplorer.filterProvider')).toBeInTheDocument();
    expect(screen.getByLabelText('observabilityExplorer.filterModel')).toBeInTheDocument();
  });

  it('gives every page the period and filters from the URL', () => {
    grant(Permission.ADMIN_USAGE_VIEW);
    mockQuery = 'period=30d&provider=GEMINI';
    render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('30d|{"days":"30","provider":"GEMINI"}');
  });

  it('drops the Failures link without ADMIN_SYSTEM_VIEW', () => {
    grant(Permission.ADMIN_USAGE_VIEW);
    render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(
      screen.queryByRole('link', { name: 'observabilityPages.navFailures' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the user dialog closed until ?user= names a user', () => {
    grant(Permission.ADMIN_USAGE_VIEW);
    const { rerender } = render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(screen.getByTestId('user-dialog')).toHaveTextContent('closed');
    mockQuery = 'period=7d&user=user-7';
    rerender(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(screen.getByTestId('user-dialog')).toHaveTextContent('user-7');
  });

  it('closing the dialog removes only the user from the URL', () => {
    grant(Permission.ADMIN_USAGE_VIEW);
    mockPath = '/observability/users';
    mockQuery = 'period=30d&q=jane&user=user-7';
    render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    screen.getByRole('button', { name: 'close-dialog' }).click();
    expect(mockReplace).toHaveBeenCalledWith('/observability/users?period=30d&q=jane', {
      scroll: false,
    });
  });

  it('keeps the old page on the hub for an actor without ADMIN_USAGE_VIEW', () => {
    grant();
    render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(screen.getByText('legacy-observability')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sends that actor from any sub-page back to the hub', () => {
    grant();
    mockPath = '/observability/users';
    render(
      <ObservabilityShell>
        <Child />
      </ObservabilityShell>,
    );
    expect(mockReplace).toHaveBeenCalledWith('/observability');
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.queryByText('legacy-observability')).not.toBeInTheDocument();
  });
});
