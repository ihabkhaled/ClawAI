import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterChainTab } from '@/components/admin/smart-router/smart-router-chain-tab';
import {
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterConfigurationMode,
  RouterConfigurationStatus,
  RouterProvider,
} from '@/enums/router-configuration.enum';
import type { RouterConfigurationDetail } from '@/types/smart-router-admin.types';

vi.mock('@/components/admin/smart-router/smart-router-chain-entry-list', () => ({
  SmartRouterChainEntryList: () => <div data-testid="entry-list" />,
}));
vi.mock('@/components/admin/smart-router/smart-router-add-entry-form', () => ({
  SmartRouterAddEntryForm: () => <div data-testid="add-entry-form" />,
}));

const t = (key: string): string => key;

function makeConfiguration(status: RouterConfigurationStatus): RouterConfigurationDetail {
  return {
    id: 'rev-1',
    scope: 'GLOBAL',
    revision: 1,
    status,
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
    supersedesRevision: null,
    publishedAt: null,
    publishedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    entries: [
      {
        id: 'e1',
        order: 1,
        enabled: true,
        role: RouterChainEntryRole.PRIMARY,
        deploymentId: null,
        modelAlias: 'claude-sonnet-4-5',
        provider: RouterProvider.ANTHROPIC,
        attemptTimeoutMs: 1600,
        retries: 0,
        triggers: [],
        skipWhenProviderCircuitOpen: true,
        minConfidence: null,
        maxCostMicroUsd: null,
        billingModel: RouterConfigurationBillingModel.UNKNOWN,
        lastValidatedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof SmartRouterChainTab>> = {}) {
  return {
    configuration: makeConfiguration(RouterConfigurationStatus.DRAFT),
    isLoading: false,
    isError: false,
    error: null,
    isDraft: true,
    isUpdatePending: false,
    onReorder: vi.fn(),
    onRemove: vi.fn(),
    onAdd: vi.fn(),
    onCreateDraft: vi.fn(),
    isCreateDraftPending: false,
    t,
    ...overrides,
  };
}

describe('SmartRouterChainTab', () => {
  it('shows the editable form when editing a draft', () => {
    render(<SmartRouterChainTab {...baseProps()} />);
    expect(screen.getByText('smartRouterAdmin.chain.draftInProgress')).toBeInTheDocument();
    expect(screen.getByTestId('add-entry-form')).toBeInTheDocument();
  });

  it('shows a create-draft CTA and hides the add form for a published (read-only) chain', () => {
    render(
      <SmartRouterChainTab
        {...baseProps({
          configuration: makeConfiguration(RouterConfigurationStatus.PUBLISHED),
          isDraft: false,
        })}
      />,
    );
    expect(screen.getByText('smartRouterAdmin.chain.viewingPublishedReadOnly')).toBeInTheDocument();
    expect(screen.queryByTestId('add-entry-form')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'smartRouterAdmin.revisions.createDraft' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state when there are no entries', () => {
    const empty = { ...makeConfiguration(RouterConfigurationStatus.DRAFT), entries: [] };
    render(<SmartRouterChainTab {...baseProps({ configuration: empty })} />);
    expect(screen.getByText('smartRouterAdmin.chain.noEntries')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    render(<SmartRouterChainTab {...baseProps({ isError: true, error: new Error('boom') })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });
});
