import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SmartRouterCompareDiffRow } from '@/components/admin/smart-router/smart-router-compare-diff-row';
import { Table, TableBody } from '@/components/ui/table';
import { VersionDiffStatus } from '@/enums';
import {
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterProvider,
} from '@/enums/router-configuration.enum';
import type { ChainEntryInput, RouterChainEntryDiffItem } from '@/types/smart-router-admin.types';

const t = (key: string): string => key;

const sampleInput: ChainEntryInput = {
  role: RouterChainEntryRole.PRIMARY,
  provider: RouterProvider.ANTHROPIC,
  modelAlias: 'claude-sonnet-4-5',
  enabled: true,
  attemptTimeoutMs: 1600,
  retries: 0,
  triggers: [],
  skipWhenProviderCircuitOpen: true,
  billingModel: RouterConfigurationBillingModel.UNKNOWN,
};

function renderRow(diffItem: RouterChainEntryDiffItem) {
  return render(
    <Table>
      <TableBody>
        <SmartRouterCompareDiffRow diffItem={diffItem} t={t} />
      </TableBody>
    </Table>,
  );
}

describe('SmartRouterCompareDiffRow', () => {
  it('shows the added badge and the after entry for an added row', () => {
    renderRow({
      order: 1,
      status: VersionDiffStatus.ADDED,
      before: null,
      after: sampleInput,
      changedFields: [],
    });
    expect(screen.getByText('smartRouterAdmin.enums.diffStatus.ADDED')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument();
  });

  it('shows the removed badge and the before entry for a removed row', () => {
    renderRow({
      order: 1,
      status: VersionDiffStatus.REMOVED,
      before: sampleInput,
      after: null,
      changedFields: [],
    });
    expect(screen.getByText('smartRouterAdmin.enums.diffStatus.REMOVED')).toBeInTheDocument();
  });

  it('lists changed field names for a changed row', () => {
    renderRow({
      order: 1,
      status: VersionDiffStatus.CHANGED,
      before: sampleInput,
      after: { ...sampleInput, retries: 3 },
      changedFields: ['retries'],
    });
    expect(screen.getByText(/retries/)).toBeInTheDocument();
  });
});
