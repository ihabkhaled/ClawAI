import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminDeploymentPage from '@/app/(portal)/admin/deployment/page';

const mockHook = vi.fn();

vi.mock('@/hooks/admin/use-deployment-page', () => ({ useDeploymentPage: () => mockHook() }));
vi.mock('@/components/admin/deployment/deployment-status-content', () => ({
  DeploymentStatusContent: () => <div data-testid="deployment-status" />,
}));
vi.mock('@/components/admin/deployment/deployment-control-panel', () => ({
  DeploymentControlPanel: () => <div data-testid="deployment-controls" />,
}));
vi.mock('@/components/admin/deployment/deployment-credentials-card', () => ({
  DeploymentCredentialsCard: () => <div data-testid="deployment-credentials" />,
}));
vi.mock('@/components/admin/deployment/deployment-run-progress-card', () => ({
  DeploymentRunProgressCard: () => <div data-testid="deployment-progress" />,
}));
vi.mock('@/components/admin/deployment/deployment-troubleshooting-card', () => ({
  DeploymentTroubleshootingCard: () => <div data-testid="deployment-troubleshooting" />,
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function controller(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    t: (key: string) => key,
    locale: 'en',
    user: { id: 'super-admin', role: 'ADMIN', isSuperAdmin: true },
    status: { state: 'completed' },
    isLoading: false,
    isError: false,
    error: null,
    isRefreshing: false,
    retry: vi.fn(),
    actions: { isBusy: false },
    credentials: { isEditing: false },
    progress: { progress: null, isLoading: false },
    ...overrides,
  };
}

describe('AdminDeploymentPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the monitor for the seeded super administrator', () => {
    mockHook.mockReturnValue(controller());
    render(<AdminDeploymentPage />);
    expect(screen.getByTestId('deployment-status')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-controls')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-progress')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-credentials')).toBeInTheDocument();
  });

  it('denies another administrator before rendering deployment data', () => {
    mockHook.mockReturnValue(controller({ user: { role: 'ADMIN', isSuperAdmin: false } }));
    render(<AdminDeploymentPage />);
    expect(screen.getByText('common.accessDeniedTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deployment-controls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deployment-credentials')).not.toBeInTheDocument();
  });

  it('waits for a fresh profile before denying a cached pre-migration administrator', () => {
    mockHook.mockReturnValue(
      controller({
        user: { role: 'ADMIN', isSuperAdmin: false },
        isLoading: true,
        status: null,
      }),
    );
    render(<AdminDeploymentPage />);
    expect(screen.getByText('adminDeployment.loading')).toBeInTheDocument();
    expect(screen.queryByText('common.accessDeniedTitle')).not.toBeInTheDocument();
  });
});
