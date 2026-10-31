import { buildTerminationData } from '../termination-data.utility';
import { toSessionFamilyView } from '../session-family-view.utility';
import type { SessionFamilyRow } from '../../types/session-admin.types';

const at = new Date('2026-10-31T10:00:00Z');

function row(overrides: Partial<SessionFamilyRow> = {}): SessionFamilyRow {
  return {
    family_id: 'f1',
    state: 'ACTIVE',
    ip_address: null,
    country_code: null,
    user_agent: null,
    os: null,
    browser: null,
    device_kind: null,
    client_kind: 'WEB',
    client_name: null,
    persistent: true,
    login_at: at,
    last_used_at: at,
    expires_at: at,
    rotations: 1,
    terminated_at: null,
    termination_reason: null,
    terminated_by_user_id: null,
    terminated_by_name: null,
    total: 1,
    ...overrides,
  };
}

describe('buildTerminationData', () => {
  it('writes revokedAt and the termination record together', () => {
    expect(buildTerminationData('ADMIN_TERMINATED' as never, at, 'admin-1')).toEqual({
      revokedAt: at,
      terminatedAt: at,
      terminationReason: 'ADMIN_TERMINATED',
      terminatedByUserId: 'admin-1',
    });
  });

  it('has no actor for a self-service or automatic closure', () => {
    expect(buildTerminationData('USER_LOGOUT' as never, at).terminatedByUserId).toBeNull();
  });
});

describe('toSessionFamilyView', () => {
  it('marks only the matching family as current', () => {
    expect(toSessionFamilyView(row(), 'f1').isCurrent).toBe(true);
    expect(toSessionFamilyView(row(), 'other').isCurrent).toBe(false);
    expect(toSessionFamilyView(row(), null).isCurrent).toBe(false);
  });

  it('reads an unknown stored reason as null and an unknown state as TERMINATED', () => {
    const view = toSessionFamilyView(
      row({ state: 'WEIRD', termination_reason: 'NOT_A_REASON' }),
      null,
    );
    expect(view.state).toBe('TERMINATED');
    expect(view.terminationReason).toBeNull();
  });

  it('keeps a known reason and who ended it', () => {
    const view = toSessionFamilyView(
      row({
        state: 'TERMINATED',
        termination_reason: 'GLOBAL_TERMINATION',
        terminated_by_user_id: 'a1',
        terminated_by_name: 'boss',
      }),
      null,
    );
    expect(view).toMatchObject({
      state: 'TERMINATED',
      terminationReason: 'GLOBAL_TERMINATION',
      terminatedByName: 'boss',
    });
  });
});
