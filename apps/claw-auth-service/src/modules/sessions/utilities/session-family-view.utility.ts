import { SessionState } from '../enums/session-state.enum';
import { SessionTerminationReason } from '../enums/session-termination-reason.enum';
import type { SessionFamilyRow, SessionFamilyView } from '../types/session-admin.types';

function asState(value: string): SessionState {
  return Object.values(SessionState).find((state) => state === value) ?? SessionState.TERMINATED;
}

function asReason(value: string | null): SessionTerminationReason | null {
  return Object.values(SessionTerminationReason).find((reason) => reason === value) ?? null;
}

/** Maps a family row to the wire shape. An unrecognised stored reason reads as null ("unknown"). */
export function toSessionFamilyView(
  row: SessionFamilyRow,
  currentFamilyId: string | null,
): SessionFamilyView {
  return {
    familyId: row.family_id,
    state: asState(row.state),
    ipAddress: row.ip_address,
    countryCode: row.country_code,
    userAgent: row.user_agent,
    os: row.os,
    browser: row.browser,
    deviceKind: row.device_kind,
    clientKind: row.client_kind,
    clientName: row.client_name,
    persistent: row.persistent,
    loginAt: row.login_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    rotations: row.rotations,
    terminatedAt: row.terminated_at,
    terminationReason: asReason(row.termination_reason),
    terminatedByUserId: row.terminated_by_user_id,
    terminatedByName: row.terminated_by_name,
    isCurrent: currentFamilyId !== null && row.family_id === currentFamilyId,
  };
}
