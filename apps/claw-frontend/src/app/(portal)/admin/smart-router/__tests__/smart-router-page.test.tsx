import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSmartRouterPage from '@/app/(portal)/admin/smart-router/page';

const mockHook = vi.fn();

vi.mock('@/hooks/admin/use-smart-router-admin-page', () => ({
  useSmartRouterAdminPage: () => mockHook(),
}));
vi.mock('@/components/admin/smart-router/smart-router-overview-tab', () => ({
  SmartRouterOverviewTab: () => <div data-testid="overview-tab" />,
}));
vi.mock('@/components/admin/smart-router/smart-router-chain-tab', () => ({
  SmartRouterChainTab: () => <div data-testid="chain-tab" />,
}));
vi.mock('@/components/admin/smart-router/smart-router-revisions-tab', () => ({
  SmartRouterRevisionsTab: () => <div data-testid="revisions-tab" />,
}));
vi.mock('@/components/admin/smart-router/smart-router-revision-detail-tab', () => ({
  SmartRouterRevisionDetailTab: () => <div data-testid="revision-detail-tab" />,
}));
vi.mock('@/components/admin/smart-router/smart-router-publish-tab', () => ({
  SmartRouterPublishTab: () => <div data-testid="publish-tab" />,
}));
vi.mock('@/components/admin/smart-router/smart-router-compare-tab', () => ({
  SmartRouterCompareTab: () => <div data-testid="compare-tab" />,
}));

function controller(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    t: (key: string) => key,
    locale: 'en',
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    overview: {},
    chain: {},
    revisions: {},
    revisionDetail: {},
    publish: {},
    compare: {},
    ...overrides,
  };
}

describe('AdminSmartRouterPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page title and the active (overview) tab', () => {
    mockHook.mockReturnValue(controller());
    render(<AdminSmartRouterPage />);
    expect(screen.getByText('smartRouterAdmin.title')).toBeInTheDocument();
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
  });

  it('renders all six tab triggers', () => {
    mockHook.mockReturnValue(controller());
    render(<AdminSmartRouterPage />);
    expect(screen.getByRole('tab', { name: 'smartRouterAdmin.tabs.overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'smartRouterAdmin.tabs.chain' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'smartRouterAdmin.tabs.revisions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'smartRouterAdmin.tabs.revisionDetail' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'smartRouterAdmin.tabs.publish' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'smartRouterAdmin.tabs.compare' })).toBeInTheDocument();
  });
});
