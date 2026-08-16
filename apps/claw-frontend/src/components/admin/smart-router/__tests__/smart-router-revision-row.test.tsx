import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterRevisionRow } from '@/components/admin/smart-router/smart-router-revision-row';
import { Table, TableBody } from '@/components/ui/table';
import {
  LowConfidenceAction,
  RouterConfigurationMode,
  RouterConfigurationStatus,
} from '@/enums/router-configuration.enum';
import type { RouterConfigurationSummary } from '@/types/smart-router-admin.types';

const t = (key: string): string => key;

const revision: RouterConfigurationSummary = {
  id: 'rev-1',
  scope: 'GLOBAL',
  revision: 2,
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
  supersedesRevision: 1,
  publishedAt: null,
  publishedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  entryCount: 5,
};

describe('SmartRouterRevisionRow', () => {
  it('renders the revision number and entry count', () => {
    render(
      <Table>
        <TableBody>
          <SmartRouterRevisionRow revision={revision} isSelected={false} onSelect={vi.fn()} t={t} />
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onSelect with the revision id when View is clicked', () => {
    const onSelect = vi.fn();
    render(
      <Table>
        <TableBody>
          <SmartRouterRevisionRow
            revision={revision}
            isSelected={false}
            onSelect={onSelect}
            t={t}
          />
        </TableBody>
      </Table>,
    );
    screen.getByRole('button', { name: 'smartRouterAdmin.revisions.view' }).click();
    expect(onSelect).toHaveBeenCalledWith('rev-1');
  });
});
