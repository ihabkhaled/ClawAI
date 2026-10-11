import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityExplorer } from '@/components/observability/explorer/observability-explorer';
import { ObservabilityContent } from '@/components/observability/observability-content';
import { OBSERVABILITY_TABS } from '@/constants/observability-explorer.constants';
import { ObservabilityTab } from '@/enums/observability-tab.enum';
import { Permission } from '@/enums/permission.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useObservabilityExplorer } from '@/hooks/observability/use-observability-explorer';

import { filtersState } from '../explorer/__tests__/explorer-fixtures';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/auth/use-permissions');
vi.mock('@/hooks/observability/use-observability-explorer');
vi.mock('@/components/observability/explorer/explorer-filters', () => ({
  ExplorerFiltersForm: () => <div data-testid="filters" />,
}));
vi.mock('@/components/observability/explorer/overview-tab', () => ({
  OverviewTab: ({ onOpenUser }: { onOpenUser: (id: string) => void }) => (
    <button
      type="button"
      onClick={() => {
        onOpenUser('user-7');
      }}
    >
      overview-open-user
    </button>
  ),
}));
vi.mock('@/components/observability/explorer/consumption-tab', () => ({
  ConsumptionTab: () => <div>consumption-tab</div>,
}));
vi.mock('@/components/observability/explorer/models-tab', () => ({
  ModelsTab: () => <div>models-tab</div>,
}));
vi.mock('@/components/observability/explorer/users-tab', () => ({
  UsersTab: () => <div>users-tab</div>,
}));
vi.mock('@/components/observability/explorer/tracing-tab', () => ({
  TracingTab: () => <div>tracing-tab</div>,
}));
vi.mock('@/components/observability/explorer/failures-tab', () => ({
  FailuresTab: () => <div>failures-tab</div>,
}));
vi.mock('@/components/observability/explorer/user-consumption-dialog', () => ({
  UserConsumptionDialog: ({ userId }: { userId: string | null }) => (
    <div data-testid="user-dialog">{userId ?? 'closed'}</div>
  ),
}));
vi.mock('@/components/observability/legacy-observability', () => ({
  LegacyObservability: () => <div>legacy-observability</div>,
}));

const mockExplorer = vi.mocked(useObservabilityExplorer);
const mockPermissions = vi.mocked(usePermissions);

type ExplorerState = ReturnType<typeof useObservabilityExplorer>;

function explorerState(overrides: Partial<ExplorerState> = {}): ExplorerState {
  return {
    tab: ObservabilityTab.Overview,
    setTab: vi.fn(),
    tabs: [...OBSERVABILITY_TABS],
    filters: filtersState(),
    options: { providers: [], models: [], workflows: [] },
    openUserId: null,
    setOpenUserId: vi.fn(),
    ...overrides,
  };
}

function permissions(can: (permission: Permission) => boolean): ReturnType<typeof usePermissions> {
  return { isAdmin: true, isSuperAdmin: false, can, canAny: () => false };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ObservabilityExplorer', () => {
  it('shows the shared filters, all six tabs and the active section', () => {
    mockExplorer.mockReturnValue(explorerState());
    render(<ObservabilityExplorer />);
    expect(screen.getByTestId('filters')).toBeInTheDocument();
    for (const key of ['Overview', 'Consumption', 'Models', 'Users', 'Tracing', 'Failures']) {
      expect(
        screen.getByRole('tab', { name: `observabilityExplorer.tab${key}` }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText('overview-open-user')).toBeInTheDocument();
  });

  it('switches the section when a tab is activated', () => {
    const state = explorerState();
    mockExplorer.mockReturnValue(state);
    render(<ObservabilityExplorer />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'observabilityExplorer.tabUsers' }));
    expect(state.setTab).toHaveBeenCalledWith(ObservabilityTab.Users);
  });

  it('renders the section of the active tab', () => {
    mockExplorer.mockReturnValue(explorerState({ tab: ObservabilityTab.Failures }));
    render(<ObservabilityExplorer />);
    expect(screen.getByText('failures-tab')).toBeInTheDocument();
  });

  it('omits the failures tab for an admin without system access', () => {
    mockExplorer.mockReturnValue(
      explorerState({
        tabs: OBSERVABILITY_TABS.filter((d) => d.tab !== ObservabilityTab.Failures),
      }),
    );
    render(<ObservabilityExplorer />);
    expect(
      screen.queryByRole('tab', { name: 'observabilityExplorer.tabFailures' }),
    ).not.toBeInTheDocument();
  });

  it('opens the user dialog for a user picked in a section', () => {
    const state = explorerState();
    mockExplorer.mockReturnValue(state);
    render(<ObservabilityExplorer />);
    fireEvent.click(screen.getByText('overview-open-user'));
    expect(state.setOpenUserId).toHaveBeenCalledWith('user-7');
  });

  it('passes the open user to the dialog', () => {
    mockExplorer.mockReturnValue(explorerState({ openUserId: 'user-7' }));
    render(<ObservabilityExplorer />);
    expect(screen.getByTestId('user-dialog')).toHaveTextContent('user-7');
  });
});

describe('ObservabilityContent', () => {
  it('shows the explorer to an actor who can view usage', () => {
    mockPermissions.mockReturnValue(
      permissions((permission) => permission === Permission.ADMIN_USAGE_VIEW),
    );
    mockExplorer.mockReturnValue(explorerState());
    render(<ObservabilityContent />);
    expect(screen.getByTestId('filters')).toBeInTheDocument();
    expect(screen.queryByText('legacy-observability')).not.toBeInTheDocument();
  });

  it('keeps the old page for everyone else', () => {
    mockPermissions.mockReturnValue(permissions(() => false));
    render(<ObservabilityContent />);
    expect(screen.getByText('legacy-observability')).toBeInTheDocument();
    expect(screen.queryByTestId('filters')).not.toBeInTheDocument();
  });
});
