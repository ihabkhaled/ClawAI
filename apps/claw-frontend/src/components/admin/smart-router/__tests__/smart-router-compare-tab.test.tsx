import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterCompareTab } from '@/components/admin/smart-router/smart-router-compare-tab';
import { VersionDiffStatus } from '@/enums';
import {
  LowConfidenceAction,
  RouterConfigurationMode,
  RouterConfigurationStatus,
} from '@/enums/router-configuration.enum';
import type { RouterConfigurationSummary } from '@/types/smart-router-admin.types';

vi.mock('@/components/admin/smart-router/smart-router-compare-diff-row', () => ({
  SmartRouterCompareDiffRow: ({ diffItem }: { diffItem: { order: number } }) => (
    <tr data-testid={`diff-row-${diffItem.order}`} />
  ),
}));

const t = (key: string): string => key;

const revision: RouterConfigurationSummary = {
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
  publishedAt: null,
  publishedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  entryCount: 1,
};

function baseProps(overrides: Partial<React.ComponentProps<typeof SmartRouterCompareTab>> = {}) {
  return {
    revisions: [revision],
    fromId: null,
    toId: null,
    onFromChange: vi.fn(),
    onToChange: vi.fn(),
    diff: null,
    isLoading: false,
    t,
    ...overrides,
  };
}

describe('SmartRouterCompareTab', () => {
  it('prompts for a selection when nothing is selected', () => {
    render(<SmartRouterCompareTab {...baseProps()} />);
    expect(screen.getByText('smartRouterAdmin.compare.noSelection')).toBeInTheDocument();
  });

  it('shows the no-changes message when every entry is unchanged', () => {
    render(
      <SmartRouterCompareTab
        {...baseProps({
          fromId: 'rev-1',
          toId: 'rev-1',
          diff: {
            fromRevision: 1,
            toRevision: 1,
            entries: [
              {
                order: 1,
                status: VersionDiffStatus.UNCHANGED,
                before: null,
                after: null,
                changedFields: [],
              },
            ],
          },
        })}
      />,
    );
    expect(screen.getByText('smartRouterAdmin.compare.noChanges')).toBeInTheDocument();
  });

  it('renders a diff row per changed entry', () => {
    render(
      <SmartRouterCompareTab
        {...baseProps({
          fromId: 'rev-1',
          toId: 'rev-2',
          diff: {
            fromRevision: 1,
            toRevision: 2,
            entries: [
              {
                order: 1,
                status: VersionDiffStatus.ADDED,
                before: null,
                after: null,
                changedFields: [],
              },
            ],
          },
        })}
      />,
    );
    expect(screen.getByTestId('diff-row-1')).toBeInTheDocument();
  });
});
