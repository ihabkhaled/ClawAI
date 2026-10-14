import type { AdminServerView, CuratedEntryView } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { tStub } from '../../../../plugins/__tests__/plugins-fixtures';
import { AdminCurationEntryRow } from '../admin-curation-entry-row';
import { AdminCurationQueueRow } from '../admin-curation-queue-row';
import { AdminCurationRejectDialog } from '../admin-curation-reject-dialog';

const SERVER: AdminServerView = {
  id: 'srv-1',
  name: 'My tracker',
  slug: 'mcp12345678',
  submitterUserId: 'user-9',
  urlHost: 'mcp.tracker.example.com',
  urlPath: '/v1/mcp',
  authKind: 'API_KEY',
  hasCredential: true,
  status: 'PENDING_APPROVAL',
  highestRisk: 'WRITE',
  toolCount: 2,
  tools: [
    { name: 'list_issues', description: 'List issues.', riskLevel: 'READ' },
    { name: 'create_issue', description: 'Create an issue.', riskLevel: 'WRITE' },
  ],
  toolsHash: 'hash',
  serverName: 'Tracker',
  createdAt: '2026-10-15T08:00:00.000Z',
  decidedBy: null,
  decidedAt: null,
  decisionReason: null,
};

const ENTRY: CuratedEntryView = {
  slug: 'context7',
  status: 'DRAFT',
  name: 'Context7',
  publisher: 'Context7',
  category: 'dev',
  iconKey: 'code',
  homepageUrl: null,
  url: 'https://mcp.context7.com/mcp',
  transport: 'streamable-http',
  authKind: 'NONE',
  authHeaderName: null,
  globallyEnabled: false,
  featured: false,
  deleted: false,
  needsVerification: true,
  adminNotes: 'URL: verify.',
  allowedPlanSlugs: [],
  version: '1.0.0',
  installCount: 0,
  tools: [{ name: 'placeholder', riskLevel: 'WRITE', disabledByAdmin: false }],
  health: { status: 'UNKNOWN', latencyMs: null, checkedAt: null, errorCode: null },
  translations: {},
  source: 'CURATED_MCP',
};

describe('catalog curation: approval queue row', () => {
  it('shows the host, the submitter and the highest risk, never a query string', () => {
    render(
      <AdminCurationQueueRow
        server={SERVER}
        busy={false}
        onApprove={() => undefined}
        onReject={() => undefined}
        t={tStub}
      />,
    );

    expect(screen.getByText('mcp.tracker.example.com/v1/mcp')).toBeTruthy();
    expect(screen.getByText(/pluginsAdminCatalog.queue.submitter\|user-9/)).toBeTruthy();
    expect(screen.getByTestId('plugin-risk-badge')).toBeTruthy();
  });

  it('approves and rejects the right server', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <AdminCurationQueueRow
        server={SERVER}
        busy={false}
        onApprove={onApprove}
        onReject={onReject}
        t={tStub}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pluginsAdminCatalog.queue.approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'pluginsAdminCatalog.queue.reject' }));

    expect(onApprove).toHaveBeenCalledWith('srv-1');
    expect(onReject).toHaveBeenCalledWith(SERVER);
  });

  it('cannot approve a server that is not waiting for a decision', () => {
    render(
      <AdminCurationQueueRow
        server={{ ...SERVER, status: 'APPROVED' }}
        busy={false}
        onApprove={() => undefined}
        onReject={() => undefined}
        t={tStub}
      />,
    );

    const approve = screen.getByRole('button', { name: 'pluginsAdminCatalog.queue.approve' });
    expect((approve as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('catalog curation: reject dialog', () => {
  it('needs a reason before it will reject, and sends it trimmed', () => {
    const onConfirm = vi.fn();
    const props = {
      server: SERVER,
      busy: false,
      onConfirm,
      onClose: () => undefined,
      onReason: () => undefined,
      t: tStub,
    };
    const { rerender } = render(<AdminCurationRejectDialog {...props} reason="  " />);
    const button = (): HTMLButtonElement =>
      screen.getByRole('button', { name: 'pluginsAdminCatalog.queue.reject' });

    expect(button().disabled).toBe(true);

    rerender(<AdminCurationRejectDialog {...props} reason="  Not allowed.  " />);
    fireEvent.click(button());

    expect(onConfirm).toHaveBeenCalledWith('srv-1', 'Not allowed.');
  });
});

describe('catalog curation: entry row', () => {
  it('flags an unverified seed and switches an entry on or off', () => {
    const onEnabled = vi.fn();
    render(
      <AdminCurationEntryRow
        entry={ENTRY}
        busy={false}
        onEnabled={onEnabled}
        onHealth={() => undefined}
        onEdit={() => undefined}
        onDelete={() => undefined}
        t={tStub}
      />,
    );

    expect(screen.getByText('pluginsAdminCatalog.entries.needsVerification')).toBeTruthy();
    expect(screen.getByText('URL: verify.')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch'));
    expect(onEnabled).toHaveBeenCalledWith('context7', true);
  });

  it('checks health, edits and deletes the right entry', () => {
    const onHealth = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <AdminCurationEntryRow
        entry={ENTRY}
        busy={false}
        onEnabled={() => undefined}
        onHealth={onHealth}
        onEdit={onEdit}
        onDelete={onDelete}
        t={tStub}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /checkHealth/ }));
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

    expect(onHealth).toHaveBeenCalledWith('context7');
    expect(onEdit).toHaveBeenCalledWith(ENTRY);
    expect(onDelete).toHaveBeenCalledWith(ENTRY);
  });
});
