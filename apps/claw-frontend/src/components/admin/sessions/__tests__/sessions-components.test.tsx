import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GlobalSessionActionsCard } from '@/components/admin/sessions/global-session-actions-card';
import { SessionActionDialog } from '@/components/admin/sessions/session-action-dialog';
import { SessionStateFilter } from '@/components/admin/sessions/session-state-filter';
import { UserSessionsSummary } from '@/components/admin/sessions/user-sessions-summary';
import { UserSessionsTable } from '@/components/admin/sessions/user-sessions-table';
import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionGlobalStep } from '@/enums/session-global-step.enum';
import { SessionState } from '@/enums/session-state.enum';
import { SessionTerminationReason } from '@/enums/session-termination-reason.enum';
import type { UseGlobalSessionGuardReturn, UserSession } from '@/types/admin-sessions.types';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const t = (key: string, params?: Record<string, string | number>): string =>
  params ? `${key}|${Object.values(params).join(',')}` : key;

function session(overrides: Partial<UserSession> = {}): UserSession {
  return {
    familyId: 'f1',
    state: SessionState.ACTIVE,
    ipAddress: '41.33.1.1',
    countryCode: 'EG',
    userAgent: 'UA',
    os: 'Windows',
    browser: 'Chrome 130',
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
    ...overrides,
  };
}

function guard(overrides: Partial<UseGlobalSessionGuardReturn> = {}): UseGlobalSessionGuardReturn {
  return {
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
    submitPassword: vi.fn().mockResolvedValue(undefined),
    submitConfirm: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    lastResult: null,
    ...overrides,
  };
}

describe('UserSessionsTable', () => {
  const handlers = { onTerminate: vi.fn(), onClear: vi.fn() };

  it('shows IP, country, OS, browser, state and the login times of each row', () => {
    render(
      <UserSessionsTable sessions={[session()]} locale="en" isActing={false} t={t} {...handlers} />,
    );
    expect(screen.getByTestId('session-ip')).toHaveTextContent('41.33.1.1');
    expect(screen.getByTestId('session-country')).toHaveTextContent('EG');
    expect(screen.getByText('adminSessions.browserOnOs|Chrome 130,Windows')).toBeInTheDocument();
    expect(screen.getByTestId('session-state')).toHaveTextContent('adminSessions.stateActive');
  });

  it('offers End only on an active login, and Clear only on a finished one', () => {
    const { rerender } = render(
      <UserSessionsTable sessions={[session()]} locale="en" isActing={false} t={t} {...handlers} />,
    );
    expect(screen.getByText('adminSessions.terminate')).toBeInTheDocument();
    expect(screen.queryByText('adminSessions.clearLog')).not.toBeInTheDocument();

    rerender(
      <UserSessionsTable
        sessions={[session({ state: SessionState.EXPIRED })]}
        locale="en"
        isActing={false}
        t={t}
        {...handlers}
      />,
    );
    expect(screen.queryByText('adminSessions.terminate')).not.toBeInTheDocument();
    expect(screen.getByText('adminSessions.clearLog')).toBeInTheDocument();
  });

  it('shows who ended a terminated login, when and why', () => {
    render(
      <UserSessionsTable
        sessions={[
          session({
            state: SessionState.TERMINATED,
            terminationReason: SessionTerminationReason.ADMIN_TERMINATED,
            terminatedByName: 'boss',
            terminatedAt: '2026-10-31T12:00:00Z',
          }),
        ]}
        locale="en"
        isActing={false}
        t={t}
        {...handlers}
      />,
    );
    expect(screen.getByTestId('session-end-note')).toHaveTextContent(
      'adminSessions.reasonAdminTerminated - adminSessions.byAdmin|boss',
    );
  });

  it('labels the admin own current session and an unknown location', () => {
    render(
      <UserSessionsTable
        sessions={[session({ isCurrent: true, countryCode: null, ipAddress: null })]}
        locale="en"
        isActing={false}
        t={t}
        {...handlers}
      />,
    );
    expect(screen.getByTestId('session-current')).toHaveTextContent('adminSessions.currentBadge');
    expect(screen.getByTestId('session-country')).toHaveTextContent(
      'adminSessions.unknownLocation',
    );
    expect(screen.getByTestId('session-ip')).toHaveTextContent('-');
  });

  it('passes the clicked row to the handlers and disables them while acting', () => {
    const onTerminate = vi.fn();
    const row = session();
    const { rerender } = render(
      <UserSessionsTable
        sessions={[row]}
        locale="en"
        isActing={false}
        t={t}
        onTerminate={onTerminate}
        onClear={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('adminSessions.terminate'));
    expect(onTerminate).toHaveBeenCalledWith(row);

    rerender(
      <UserSessionsTable
        sessions={[row]}
        locale="en"
        isActing
        t={t}
        onTerminate={onTerminate}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('adminSessions.terminate')).toBeDisabled();
  });
});

describe('summary and filter', () => {
  it('shows the four counts', () => {
    render(
      <UserSessionsSummary summary={{ active: 1, expired: 2, terminated: 3, total: 6 }} t={t} />,
    );
    expect(screen.getByTestId('summary-active')).toHaveTextContent('1');
    expect(screen.getByTestId('summary-expired')).toHaveTextContent('2');
    expect(screen.getByTestId('summary-terminated')).toHaveTextContent('3');
    expect(screen.getByTestId('summary-total')).toHaveTextContent('6');
  });

  it('marks the selected state and reports a change', () => {
    const onChange = vi.fn();
    render(<SessionStateFilter value={null} onChange={onChange} t={t} />);
    expect(screen.getByText('adminSessions.filterAll')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByText('adminSessions.stateExpired'));
    expect(onChange).toHaveBeenCalledWith(SessionState.EXPIRED);
  });
});

describe('SessionActionDialog', () => {
  it('renders nothing for no target', () => {
    render(
      <SessionActionDialog
        target={null}
        isOwnAccount={false}
        isActing={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('session-action-dialog')).not.toBeInTheDocument();
  });

  it('warns "this is your current session" before ending the admin own login', () => {
    const onConfirm = vi.fn();
    render(
      <SessionActionDialog
        target={{ kind: 'terminate-one', session: session({ isCurrent: true }) }}
        isOwnAccount
        isActing={false}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('session-current-warning')).toHaveTextContent(
      'adminSessions.currentWarning',
    );
    fireEvent.click(screen.getByTestId('session-action-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows no current-session warning for someone else or for clearing logs', () => {
    const { rerender } = render(
      <SessionActionDialog
        target={{ kind: 'terminate-one', session: session() }}
        isOwnAccount={false}
        isActing={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('session-current-warning')).not.toBeInTheDocument();
    rerender(
      <SessionActionDialog
        target={{ kind: 'clear-all' }}
        isOwnAccount
        isActing={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('session-current-warning')).not.toBeInTheDocument();
  });

  it('cannot be confirmed twice while the call is running', () => {
    render(
      <SessionActionDialog
        target={{ kind: 'terminate-all' }}
        isOwnAccount={false}
        isActing
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('session-action-confirm')).toBeDisabled();
  });
});

describe('GlobalSessionActionsCard (two-step guard)', () => {
  it('a single click only starts the guard; it never runs the action', () => {
    const g = guard();
    render(<GlobalSessionActionsCard guard={g} t={t} />);
    fireEvent.click(screen.getByTestId('global-terminate-button'));
    expect(g.start).toHaveBeenCalledWith(SessionGlobalAction.TERMINATE_ALL);
    fireEvent.click(screen.getByTestId('global-clear-button'));
    expect(g.start).toHaveBeenCalledWith(SessionGlobalAction.CLEAR_ALL_LOGS);
    expect(g.submitConfirm).not.toHaveBeenCalled();
  });

  it('step one asks for the password and cannot continue with an empty one', () => {
    const g = guard({
      step: SessionGlobalStep.PASSWORD,
      action: SessionGlobalAction.TERMINATE_ALL,
    });
    render(<GlobalSessionActionsCard guard={g} t={t} />);
    expect(screen.getByTestId('global-password-dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('global-confirm-dialog')).not.toBeInTheDocument();
    expect(screen.getByText('adminSessions.passwordContinue')).toBeDisabled();
  });

  it('step one submits the typed password', () => {
    const g = guard({
      step: SessionGlobalStep.PASSWORD,
      action: SessionGlobalAction.TERMINATE_ALL,
      password: 'secret',
    });
    render(<GlobalSessionActionsCard guard={g} t={t} />);
    fireEvent.click(screen.getByText('adminSessions.passwordContinue'));
    expect(g.submitPassword).toHaveBeenCalled();
  });

  it('step two states that the admin own session is kept and blocks until the phrase matches', () => {
    const g = guard({
      step: SessionGlobalStep.CONFIRM,
      action: SessionGlobalAction.TERMINATE_ALL,
      expectedPhrase: 'TERMINATE ALL',
      isPhraseValid: false,
    });
    render(<GlobalSessionActionsCard guard={g} t={t} />);
    expect(screen.getByTestId('global-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('global-keeps-session')).toHaveTextContent(
      'adminSessions.keepsYourSession',
    );
    expect(screen.getByTestId('global-confirm-button')).toBeDisabled();
  });

  it('step two enables the button once the phrase matches and confirms', () => {
    const g = guard({
      step: SessionGlobalStep.CONFIRM,
      action: SessionGlobalAction.CLEAR_ALL_LOGS,
      expectedPhrase: 'CLEAR ALL LOGS',
      phrase: 'CLEAR ALL LOGS',
      isPhraseValid: true,
    });
    render(<GlobalSessionActionsCard guard={g} t={t} />);
    expect(screen.queryByTestId('global-keeps-session')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('global-confirm-button'));
    expect(g.submitConfirm).toHaveBeenCalled();
  });
});
