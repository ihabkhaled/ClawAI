import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppConfigRow } from '@/components/workspace-providers/app-config-row';
import { WorkspaceProviderAppConfigStatus } from '@/enums/workspace-provider-app-config-status.enum';
import { WorkspaceProviderAuthMode } from '@/enums/workspace-provider-auth-mode.enum';
import type { WorkspaceProviderAppConfig } from '@/types';

function makeConfig(
  overrides: Partial<WorkspaceProviderAppConfig> = {},
): WorkspaceProviderAppConfig {
  return {
    id: 'cfg-1',
    provider: 'GITHUB',
    definitionId: 'def-1',
    name: 'GitHub App',
    description: null,
    authMode: WorkspaceProviderAuthMode.OAUTH2,
    publicConfig: {},
    scopes: ['repo'],
    status: WorkspaceProviderAppConfigStatus.READY,
    lastValidatedAt: '2026-05-01T00:00:00.000Z',
    validationError: null,
    secretVersion: 1,
    hasSecret: true,
    createdBy: 'admin',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

const baseHandlers = {
  onTest: vi.fn(),
  onDelete: vi.fn(),
  onConnect: vi.fn(),
  onEdit: vi.fn(),
};

// A passthrough `t` is enough — the row renders the keys verbatim and we
// assert on those (matches the convention used in plan-row.test.tsx).
const t = (key: string): string => key;

function renderRow(canManage: boolean): void {
  render(
    <table>
      <tbody>
        <AppConfigRow
          config={makeConfig()}
          {...baseHandlers}
          isTestPending={false}
          isDeletePending={false}
          isConnectPending={false}
          canManage={canManage}
          t={t}
        />
      </tbody>
    </table>,
  );
}

describe('AppConfigRow — RBAC-driven visibility', () => {
  it('exposes a labeled stacked layout for narrow viewports', () => {
    const { container } = render(
      <table>
        <tbody>
          <AppConfigRow
            config={makeConfig()}
            {...baseHandlers}
            isTestPending={false}
            isDeletePending={false}
            isConnectPending={false}
            canManage
            t={t}
          />
        </tbody>
      </table>,
    );

    expect(container.querySelector('tr')).toHaveClass('touch:block');
    expect(container.querySelector('td')).toHaveAttribute(
      'data-label',
      'workspaceProviders.appConfigs.columns.name',
    );
    expect(container.querySelector('td:last-child > div')).toHaveClass('flex-wrap');
  });

  describe('as a regular USER (canManage=false)', () => {
    it('renders the Connect button (USER may initiate OAuth on a READY OAUTH2 config)', () => {
      renderRow(false);
      expect(
        screen.getByRole('button', { name: /workspaceProviders\.appConfigs\.connect/i }),
      ).toBeInTheDocument();
    });

    it('hides the Test button (admin-only diagnostic surface)', () => {
      renderRow(false);
      expect(
        screen.queryByRole('button', { name: /workspaceProviders\.appConfigs\.test/i }),
      ).not.toBeInTheDocument();
    });

    it('hides Edit and Delete icon buttons (admin-only mutations)', () => {
      renderRow(false);
      const buttons = screen.getAllByRole('button');
      // Only the Connect button should remain on a READY OAUTH2 row.
      expect(buttons).toHaveLength(1);
    });
  });

  describe('as an ADMIN (canManage=true)', () => {
    it('renders Test, Connect, Edit, and Delete buttons', () => {
      renderRow(true);
      expect(
        screen.getByRole('button', { name: /workspaceProviders\.appConfigs\.test/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /workspaceProviders\.appConfigs\.connect/i }),
      ).toBeInTheDocument();
      // Edit + Delete are icon-only; assert by button count instead.
      const buttons = screen.getAllByRole('button');
      // Test + Connect + Edit + Delete = 4
      expect(buttons).toHaveLength(4);
    });
  });
});
