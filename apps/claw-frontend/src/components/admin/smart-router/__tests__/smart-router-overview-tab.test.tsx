import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterOverviewTab } from '@/components/admin/smart-router/smart-router-overview-tab';
import {
  LowConfidenceAction,
  RouterConfigurationMode,
  RouterConfigurationStatus,
} from '@/enums/router-configuration.enum';
import type { RouterConfigurationSummary } from '@/types/smart-router-admin.types';

const t = (key: string): string => key;

const published: RouterConfigurationSummary = {
  id: 'rev-1',
  scope: 'GLOBAL',
  revision: 3,
  status: RouterConfigurationStatus.PUBLISHED,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  enabled: true,
  totalDeadlineMs: 30_000,
  maxAttempts: 3,
  maxRouterInputTokens: 1000,
  maxRouterOutputTokens: 1000,
  minConfidence: 0.6,
  lowConfidenceAction: LowConfidenceAction.DETERMINISTIC_ONLY,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  safeTraceLevel: 'FULL',
  legacyLocalRollbackEnabled: false,
  supersedesRevision: 2,
  publishedAt: '2026-01-01T00:00:00.000Z',
  publishedBy: 'admin-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  entryCount: 4,
};

describe('SmartRouterOverviewTab', () => {
  it('shows the empty state when nothing is published', () => {
    render(
      <SmartRouterOverviewTab
        published={null}
        isLoading={false}
        isError={false}
        error={null}
        isTogglePending={false}
        onToggleEnabled={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('smartRouterAdmin.overview.noPublished')).toBeInTheDocument();
  });

  it('renders the published revision summary', () => {
    render(
      <SmartRouterOverviewTab
        published={published}
        isLoading={false}
        isError={false}
        error={null}
        isTogglePending={false}
        onToggleEnabled={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('calls onToggleEnabled when the switch is clicked', () => {
    const onToggleEnabled = vi.fn();
    render(
      <SmartRouterOverviewTab
        published={published}
        isLoading={false}
        isError={false}
        error={null}
        isTogglePending={false}
        onToggleEnabled={onToggleEnabled}
        t={t}
      />,
    );
    screen.getByRole('switch').click();
    expect(onToggleEnabled).toHaveBeenCalledWith(false);
  });

  it('shows the error state', () => {
    render(
      <SmartRouterOverviewTab
        published={null}
        isLoading={false}
        isError
        error={new Error('boom')}
        isTogglePending={false}
        onToggleEnabled={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });
});
