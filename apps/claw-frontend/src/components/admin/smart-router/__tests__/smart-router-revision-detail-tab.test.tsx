import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterRevisionDetailTab } from '@/components/admin/smart-router/smart-router-revision-detail-tab';
import {
  LowConfidenceAction,
  RouterConfigurationMode,
  RouterConfigurationStatus,
} from '@/enums/router-configuration.enum';
import type { RouterConfigurationDetail } from '@/types/smart-router-admin.types';

vi.mock('@/components/admin/smart-router/smart-router-chain-entry-list', () => ({
  SmartRouterChainEntryList: () => <div data-testid="entry-list" />,
}));
vi.mock('@/components/admin/smart-router/smart-router-add-entry-form', () => ({
  SmartRouterAddEntryForm: () => <div data-testid="add-entry-form" />,
}));

const t = (key: string): string => key;

const configuration: RouterConfigurationDetail = {
  id: 'rev-1',
  scope: 'GLOBAL',
  revision: 7,
  status: RouterConfigurationStatus.SUPERSEDED,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  enabled: true,
  totalDeadlineMs: 30_000,
  maxAttempts: 3,
  maxRouterInputTokens: 1000,
  maxRouterOutputTokens: 1000,
  minConfidence: 0.6,
  lowConfidenceAction: LowConfidenceAction.FAIL_CLOSED,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  safeTraceLevel: 'FULL',
  legacyLocalRollbackEnabled: false,
  supersedesRevision: 6,
  publishedAt: null,
  publishedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  entries: [],
};

describe('SmartRouterRevisionDetailTab', () => {
  it('shows the empty-selection message when no revision is selected', () => {
    render(
      <SmartRouterRevisionDetailTab
        configuration={null}
        isLoading={false}
        isError={false}
        error={null}
        isEditable={false}
        isUpdatePending={false}
        onReorder={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('smartRouterAdmin.revisionDetail.emptySelection')).toBeInTheDocument();
  });

  it('renders the revision header fields', () => {
    render(
      <SmartRouterRevisionDetailTab
        configuration={configuration}
        isLoading={false}
        isError={false}
        error={null}
        isEditable={false}
        isUpdatePending={false}
        onReorder={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('#6')).toBeInTheDocument();
  });

  it('hides the add-entry form when not editable', () => {
    render(
      <SmartRouterRevisionDetailTab
        configuration={configuration}
        isLoading={false}
        isError={false}
        error={null}
        isEditable={false}
        isUpdatePending={false}
        onReorder={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('add-entry-form')).not.toBeInTheDocument();
  });

  it('shows the add-entry form when editable', () => {
    render(
      <SmartRouterRevisionDetailTab
        configuration={{ ...configuration, status: RouterConfigurationStatus.DRAFT }}
        isLoading={false}
        isError={false}
        error={null}
        isEditable
        isUpdatePending={false}
        onReorder={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('add-entry-form')).toBeInTheDocument();
  });
});
