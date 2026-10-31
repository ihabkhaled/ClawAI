import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSecuritySessionsPage from '@/app/(portal)/admin/security/sessions/page';
import AdminUserSessionsPage from '@/app/(portal)/admin/users/[id]/sessions/page';
import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionGlobalStep } from '@/enums/session-global-step.enum';
import { SessionState } from '@/enums/session-state.enum';

const routeHook = vi.fn();
const securityHook = vi.fn();

vi.mock('@/hooks/admin/use-user-sessions-route', () => ({
  useUserSessionsRoute: () => routeHook(),
}));
vi.mock('@/hooks/admin/use-security-sessions-page', () => ({
  useSecuritySessionsPage: () => securityHook(),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const t = (key: string, params?: Record<string, string | number>): string =>
  params ? `${key}|${Object.values(params).join(',')}` : key;

const row = {
  familyId: 'f1',
  state: SessionState.ACTIVE,
  ipAddress: '1.2.3.4',
  countryCode: 'US',
  userAgent: 'UA',
  os: 'Linux',
  browser: 'Firefox 131',
  deviceKind: 'DESKTOP',
  clientKind: 'WEB',
  clientName: null,
  persistent: true,
  loginAt: '2026-10-31T10:00:00Z',
  lastUsedAt: '2026-10-31T11:00:00Z',
  expiresAt: '2026-11-07T10:00:00Z',
  rotations: 1,
  terminatedAt: null,
  terminationReason: null,
  terminatedByUserId: null,
  terminatedByName: null,
  isCurrent: false,
};

function route(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    t,
    locale: 'en',
    userId: 'u1',
    username: 'ann',
    isAdmin: true,
    isOwnAccount: false,
    isLoading: false,
    isError: false,
    sessions: [row],
    summary: { active: 1, expired: 1, terminated: 0, total: 2 },
    meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    stateFilter: null,
    setStateFilter: vi.fn(),
    page: 1,
    pageSize: 10,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    retry: vi.fn(),
    target: null,
    openTarget: vi.fn(),
    closeTarget: vi.fn(),
    isActing: false,
    confirmTarget: vi.fn(),
    ...overrides,
  };
}

describe('AdminUserSessionsPage', () => {
  beforeEach(() => {
    routeHook.mockReset();
  });

  it('shows access denied to a non-admin and none of the data', () => {
    routeHook.mockReturnValue(route({ isAdmin: false }));
    render(<AdminUserSessionsPage />);
    expect(screen.getByText('common.accessDeniedTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('sessions-table')).not.toBeInTheDocument();
  });

  it('shows a compact table, the summary and a link back to the users', () => {
    routeHook.mockReturnValue(route());
    render(<AdminUserSessionsPage />);
    expect(screen.getByTestId('sessions-table')).toBeInTheDocument();
    expect(screen.getByTestId('sessions-summary')).toBeInTheDocument();
    expect(screen.getByText('adminSessions.backToUsers').closest('a')).toHaveAttribute(
      'href',
      '/admin/users',
    );
    expect(screen.getByText('adminSessions.descriptionFor|ann')).toBeInTheDocument();
  });

  it('has loading, error (with retry) and empty states', () => {
    routeHook.mockReturnValue(route({ isLoading: true }));
    const { rerender } = render(<AdminUserSessionsPage />);
    expect(screen.getByText('adminSessions.loading')).toBeInTheDocument();

    const retry = vi.fn();
    routeHook.mockReturnValue(route({ isError: true, retry }));
    rerender(<AdminUserSessionsPage />);
    fireEvent.click(screen.getByText('common.retry'));
    expect(retry).toHaveBeenCalled();

    routeHook.mockReturnValue(route({ sessions: [] }));
    rerender(<AdminUserSessionsPage />);
    expect(screen.getByTestId('sessions-empty')).toBeInTheDocument();
  });

  it('opens the confirm dialog for End all and Clear, and disables them when there is nothing to do', () => {
    const openTarget = vi.fn();
    routeHook.mockReturnValue(route({ openTarget }));
    const { rerender } = render(<AdminUserSessionsPage />);
    fireEvent.click(screen.getByTestId('terminate-all-button'));
    expect(openTarget).toHaveBeenCalledWith({ kind: 'terminate-all' });
    fireEvent.click(screen.getByTestId('clear-all-button'));
    expect(openTarget).toHaveBeenCalledWith({ kind: 'clear-all' });

    routeHook.mockReturnValue(
      route({ summary: { active: 0, expired: 0, terminated: 0, total: 0 }, openTarget }),
    );
    rerender(<AdminUserSessionsPage />);
    expect(screen.getByTestId('terminate-all-button')).toBeDisabled();
    expect(screen.getByTestId('clear-all-button')).toBeDisabled();
  });

  it('hands a clicked row to the confirm dialog instead of acting at once', () => {
    const openTarget = vi.fn();
    routeHook.mockReturnValue(route({ openTarget }));
    render(<AdminUserSessionsPage />);
    fireEvent.click(screen.getByText('adminSessions.terminate'));
    expect(openTarget).toHaveBeenCalledWith({ kind: 'terminate-one', session: row });
  });
});

describe('AdminSecuritySessionsPage', () => {
  const guard = {
    step: SessionGlobalStep.CLOSED,
    action: null,
    password: '',
    setPassword: vi.fn(),
    phrase: '',
    setPhrase: vi.fn(),
    expectedPhrase: '',
    isPhraseValid: false,
    isBusy: false,
    secondsLeft: 55,
    start: vi.fn(),
    submitPassword: vi.fn(),
    submitConfirm: vi.fn(),
    cancel: vi.fn(),
    lastResult: null,
  };

  it('denies anyone who is not the super administrator', () => {
    securityHook.mockReturnValue({ t, isSuperAdmin: false, isDenied: true, guard });
    render(<AdminSecuritySessionsPage />);
    expect(screen.getByText('common.accessDeniedTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('global-sessions-card')).not.toBeInTheDocument();
  });

  it('shows the danger zone to the super administrator', () => {
    securityHook.mockReturnValue({ t, isSuperAdmin: true, isDenied: false, guard });
    render(<AdminSecuritySessionsPage />);
    expect(screen.getByTestId('global-sessions-card')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('global-terminate-button'));
    expect(guard.start).toHaveBeenCalledWith(SessionGlobalAction.TERMINATE_ALL);
  });
});
