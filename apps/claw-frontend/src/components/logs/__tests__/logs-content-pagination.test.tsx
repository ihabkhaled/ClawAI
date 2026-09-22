import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuditLogsContent } from '@/components/logs/audit-logs-content';
import { ClientLogsContent } from '@/components/logs/client-logs-content';
import { ServerLogsContent } from '@/components/logs/server-logs-content';
import type { AuditLog, ClientLogEntry, ServerLogEntry } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>): string =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
    locale: 'en',
  }),
}));

// The stats strips are their own queries and have nothing to do with paging.
vi.mock('@/hooks/logs/use-client-log-stats', () => ({
  useClientLogStats: () => ({ stats: null, isLoading: false }),
}));
vi.mock('@/hooks/logs/use-server-log-stats', () => ({
  useServerLogStats: () => ({ stats: null, isLoading: false }),
}));

const meta = { page: 1, totalPages: 11, total: 213, limit: 20 };

const auditLog = {
  _id: 'audit-1',
  userId: 'user-1',
  action: 'USER_LOGIN',
  entityType: 'User',
  entityId: 'user-1',
  severity: 'INFO',
  ipAddress: '10.0.0.1',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as AuditLog;

const clientEntry = {
  _id: 'client-1',
  level: 'info',
  message: 'hello',
  timestamp: '2026-01-01T00:00:00.000Z',
} as unknown as ClientLogEntry;

const serverEntry = {
  _id: 'server-1',
  level: 'info',
  message: 'hello',
  timestamp: '2026-01-01T00:00:00.000Z',
} as unknown as ServerLogEntry;

describe.each([
  [
    'AuditLogsContent',
    (setPage: (page: number) => void, setPageSize: (size: number) => void) => (
      <AuditLogsContent
        auditLogs={[auditLog]}
        meta={meta}
        page={1}
        setPage={setPage}
        pageSize={20}
        setPageSize={setPageSize}
        isLoading={false}
        isError={false}
      />
    ),
  ],
  [
    'ClientLogsContent',
    (setPage: (page: number) => void, setPageSize: (size: number) => void) => (
      <ClientLogsContent
        logs={[clientEntry]}
        meta={meta}
        page={1}
        setPage={setPage}
        pageSize={20}
        setPageSize={setPageSize}
        isLoading={false}
        isError={false}
      />
    ),
  ],
  [
    'ServerLogsContent',
    (setPage: (page: number) => void, setPageSize: (size: number) => void) => (
      <ServerLogsContent
        logs={[serverEntry]}
        meta={meta}
        page={1}
        setPage={setPage}
        pageSize={20}
        setPageSize={setPageSize}
        isLoading={false}
        isError={false}
      />
    ),
  ],
])('%s pagination', (_name, renderSubject) => {
  it('renders the shared pagination control with a rows-per-page choice', () => {
    render(renderSubject(vi.fn(), vi.fn()));
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-rows-per-page')).toBeInTheDocument();
  });

  it('summarises from meta.total, not the rows on screen', () => {
    render(renderSubject(vi.fn(), vi.fn()));
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('"total":213');
  });

  it('asks its owner for another page rather than tracking one itself', () => {
    const setPage = vi.fn();
    render(renderSubject(setPage, vi.fn()));
    screen.getByTestId('pagination-next').click();
    expect(setPage).toHaveBeenCalledWith(2);
  });
});
