import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SyncHealthRow } from '@/components/workspace/sync-health-row';
import { FreshnessBand } from '@/enums/freshness-band.enum';
import { WorkspaceConnectorStatus } from '@/enums/workspace-connector-status.enum';
import { WorkspaceProvider } from '@/enums/workspace-provider.enum';
import type { ConnectorSyncHealth } from '@/types/workspace-sync.types';

const row: ConnectorSyncHealth = {
  connectorId: 'connector-1',
  name: 'GitHub',
  provider: WorkspaceProvider.GITHUB,
  status: WorkspaceConnectorStatus.CONNECTED,
  cadenceSeconds: 300,
  lastSyncAt: null,
  nextRunAt: null,
  freshnessBand: FreshnessBand.FRESH,
  successRate24h: 1,
  averageDurationMs: 120,
  activeRunCount: 0,
  consecutiveFailures: 0,
  lastErrorCode: null,
  pausedAt: null,
  pauseReason: null,
};

describe('SyncHealthRow mobile layout', () => {
  it('exposes every health value in a labeled mobile card', () => {
    const { container } = render(
      <table>
        <tbody>
          <SyncHealthRow row={row} t={(key) => key} />
        </tbody>
      </table>,
    );

    expect(container.querySelector('tr')).toHaveClass('touch:block');
    expect(container.querySelectorAll('td')).toHaveLength(7);
    expect(container.querySelector('td')).toHaveAttribute(
      'data-label',
      'workspaceSync.dashboard.col.connector',
    );
  });
});
