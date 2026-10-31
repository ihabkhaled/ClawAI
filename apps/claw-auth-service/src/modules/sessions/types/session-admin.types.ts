import type { SessionState } from '../enums/session-state.enum';
import type { SessionTerminationReason } from '../enums/session-termination-reason.enum';

/** One login (a refresh family) as an administrator sees it. */
export interface SessionFamilyView {
  familyId: string;
  state: SessionState;
  ipAddress: string | null;
  countryCode: string | null;
  userAgent: string | null;
  os: string | null;
  browser: string | null;
  deviceKind: string | null;
  clientKind: string;
  clientName: string | null;
  persistent: boolean;
  loginAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  rotations: number;
  terminatedAt: Date | null;
  terminationReason: SessionTerminationReason | null;
  terminatedByUserId: string | null;
  terminatedByName: string | null;
  /** True when this login is the one the calling administrator is using right now. */
  isCurrent: boolean;
}

export interface SessionSummary {
  active: number;
  expired: number;
  terminated: number;
  total: number;
}

export interface SessionListResult {
  /** Whose logins these are, so the page can name the account without another call. */
  user: { id: string; username: string };
  data: SessionFamilyView[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
  summary: SessionSummary;
}

/** Raw row of the family query (snake_case, as Postgres returns it). */
export interface SessionFamilyRow {
  family_id: string;
  state: string;
  ip_address: string | null;
  country_code: string | null;
  user_agent: string | null;
  os: string | null;
  browser: string | null;
  device_kind: string | null;
  client_kind: string;
  client_name: string | null;
  persistent: boolean;
  login_at: Date;
  last_used_at: Date;
  expires_at: Date;
  rotations: number;
  terminated_at: Date | null;
  termination_reason: string | null;
  terminated_by_user_id: string | null;
  terminated_by_name: string | null;
  total: number;
}

export interface ClearLogsResult {
  families: number;
  rows: number;
}

export interface TerminateResult {
  terminatedFamilies: number;
  terminatedRows: number;
}

export interface GlobalChallengeResult {
  token: string;
  expiresInSeconds: number;
}

export interface IdRow {
  id: string;
}

export interface CountRow {
  families: number;
  total_rows: number;
}

export interface StoredChallenge {
  adminId: string;
  action: string;
}

export interface SessionTerminationData {
  revokedAt: Date;
  terminatedAt: Date;
  terminationReason: SessionTerminationReason;
  terminatedByUserId: string | null;
}
