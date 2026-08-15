import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterRevisionsTab } from '@/components/admin/smart-router/smart-router-revisions-tab';
import {
  LowConfidenceAction,
  RouterConfigurationMode,
  RouterConfigurationStatus,
} from '@/enums/router-configuration.enum';
import type { RouterConfigurationSummary } from '@/types/smart-router-admin.types';

const t = (key: string): string => key;

function makeRevision(id: string, revision: number): RouterConfigurationSummary {
  return {
    id,
    scope: 'GLOBAL',
    revision,
    status: RouterConfigurationStatus.DRAFT,
    mode: RouterConfigurationMode.HYBRID,
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
    supersedesRevision: null,
    publishedAt: null,
    publishedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    entryCount: 1,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof SmartRouterRevisionsTab>> = {}) {
  return {
    revisions: [makeRevision('rev-1', 1)],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    statusFilter: undefined,
    onStatusFilterChange: vi.fn(),
    page: 1,
    onPageChange: vi.fn(),
    isLoading: false,
    isError: false,
    error: null,
    selectedRevisionId: null,
    onSelectRevision: vi.fn(),
    onCreateDraft: vi.fn(),
    isCreateDraftPending: false,
    t,
    ...overrides,
  };
}

describe('SmartRouterRevisionsTab', () => {
  it('renders the revisions table', () => {
    render(<SmartRouterRevisionsTab {...baseProps()} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('shows the empty state when there are no revisions', () => {
    render(<SmartRouterRevisionsTab {...baseProps({ revisions: [] })} />);
    expect(screen.getByText('smartRouterAdmin.revisions.empty')).toBeInTheDocument();
  });

  it('calls onCreateDraft when the create-draft button is clicked', () => {
    const onCreateDraft = vi.fn();
    render(<SmartRouterRevisionsTab {...baseProps({ onCreateDraft })} />);
    screen.getByRole('button', { name: 'smartRouterAdmin.revisions.createDraft' }).click();
    expect(onCreateDraft).toHaveBeenCalled();
  });

  it('disables Previous on the first page and calls onPageChange on Next', () => {
    const onPageChange = vi.fn();
    render(
      <SmartRouterRevisionsTab
        {...baseProps({
          onPageChange,
          meta: { total: 40, page: 1, limit: 20, totalPages: 2 },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'common.previous' })).toBeDisabled();
    screen.getByRole('button', { name: 'common.next' }).click();
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
