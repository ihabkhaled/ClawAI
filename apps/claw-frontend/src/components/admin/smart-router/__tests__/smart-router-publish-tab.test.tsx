import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterPublishTab } from '@/components/admin/smart-router/smart-router-publish-tab';
import {
  LowConfidenceAction,
  RouterConfigurationMode,
  RouterConfigurationStatus,
} from '@/enums/router-configuration.enum';
import type {
  RouterConfigurationDetail,
  RouterConfigurationSummary,
} from '@/types/smart-router-admin.types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const draft: RouterConfigurationDetail = {
  id: 'rev-2',
  scope: 'GLOBAL',
  revision: 2,
  status: RouterConfigurationStatus.DRAFT,
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
  supersedesRevision: 1,
  publishedAt: null,
  publishedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  entries: [],
};

const currentlyPublished: RouterConfigurationSummary = {
  id: 'rev-1',
  scope: 'GLOBAL',
  revision: 1,
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
  supersedesRevision: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  publishedBy: 'admin-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  entryCount: 3,
};

describe('SmartRouterPublishTab', () => {
  it('shows the empty-selection message when nothing is selected', () => {
    render(
      <SmartRouterPublishTab
        configuration={null}
        isLoading={false}
        currentlyPublished={null}
        isPublishable={false}
        isPending={false}
        onPublish={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('smartRouterAdmin.publish.emptySelection')).toBeInTheDocument();
  });

  it('warns and disables Publish when the selected revision is not a draft', () => {
    render(
      <SmartRouterPublishTab
        configuration={{ ...draft, status: RouterConfigurationStatus.PUBLISHED }}
        isLoading={false}
        currentlyPublished={null}
        isPublishable={false}
        isPending={false}
        onPublish={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText(/notDraftWarning/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'smartRouterAdmin.publish.confirmAction' }),
    ).toBeDisabled();
  });

  it('shows the supersede warning naming the currently published revision', () => {
    render(
      <SmartRouterPublishTab
        configuration={draft}
        isLoading={false}
        currentlyPublished={currentlyPublished}
        isPublishable
        isPending={false}
        onPublish={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText(/supersedeWarning/)).toBeInTheDocument();
  });

  it('opening the dialog and confirming calls onPublish', async () => {
    const onPublish = vi.fn();
    const user = userEvent.setup();
    render(
      <SmartRouterPublishTab
        configuration={draft}
        isLoading={false}
        currentlyPublished={currentlyPublished}
        isPublishable
        isPending={false}
        onPublish={onPublish}
        t={t}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'smartRouterAdmin.publish.confirmAction' }),
    );
    const confirmButtons = await screen.findAllByRole('button', {
      name: 'smartRouterAdmin.publish.confirmAction',
    });
    await user.click(confirmButtons[confirmButtons.length - 1] as HTMLElement);

    expect(onPublish).toHaveBeenCalledTimes(1);
  });
});
