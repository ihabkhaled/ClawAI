import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuditContent } from '@/components/audit/audit-content';
import type { AuditLog } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

// The audits table used to carry its own Previous/Next row. It now renders the
// shared control, so these assertions are about that control being present and
// fed from `meta`, not from the rows on screen.
const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`;

const log = {
  _id: 'audit-1',
  userId: 'user-1',
  action: 'USER_LOGIN',
  entityType: 'User',
  entityId: 'user-1',
  severity: 'INFO',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as AuditLog;

function renderContent(overrides: Partial<React.ComponentProps<typeof AuditContent>> = {}) {
  const setPage = vi.fn();
  const setPageSize = vi.fn();
  render(
    <AuditContent
      isLoading={false}
      isError={false}
      auditLogs={[log]}
      meta={{ page: 1, totalPages: 11, total: 213 }}
      page={1}
      setPage={setPage}
      pageSize={20}
      setPageSize={setPageSize}
      t={t}
      {...overrides}
    />,
  );
  return { setPage, setPageSize };
}

describe('AuditContent pagination', () => {
  it('renders the shared pagination control', () => {
    renderContent();
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-rows-per-page')).toBeInTheDocument();
  });

  it('summarises from meta.total, not the rows on screen', () => {
    renderContent();
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('"total":213');
  });

  it('asks its owner for another page rather than tracking one itself', () => {
    const { setPage } = renderContent();
    screen.getByTestId('pagination-next').click();
    expect(setPage).toHaveBeenCalledWith(2);
  });
});
