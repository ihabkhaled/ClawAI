import type { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import type { AbuseSignalOutcome } from '../enums/abuse-signal-outcome.enum';
import type { BannedDeviceHashKind } from '../enums/banned-device-hash-kind.enum';
import type { DeviceMarkReason } from '../enums/device-mark-reason.enum';

/** The codes that can suspend an account. */
export type CountedAbuseSignalCode =
  | AbuseSignalCode.RATE_LIMIT_TRIPPED
  | AbuseSignalCode.FORBIDDEN_PROBE
  | AbuseSignalCode.SSRF_REFUSED;

/** The thresholds of the COUNTED codes, per window. */
export type AbuseThresholds = Record<CountedAbuseSignalCode, number>;

/** Every abuse knob in one read (ADR-233). */
export type AbuseSettings = {
  enabled: boolean;
  windowMinutes: number;
  thresholds: AbuseThresholds;
  /** Rung 1, 2 and 3, in minutes. */
  suspensionMinutes: readonly [number, number, number];
  escalationDays: number;
};

/** One signal to record: who, what, and who saw it. */
export type AbuseSignalInput = {
  userId: string;
  code: AbuseSignalCode;
  source: string;
};

/** Counts per signal code at the moment of a suspension. Counts only, never a value. */
export type AbuseEvidence = Partial<Record<AbuseSignalCode, number>>;

/** What a suspension needs to start. */
export type SuspensionRequest = {
  userId: string;
  code: AbuseSignalCode;
  evidence: AbuseEvidence;
};

export type SuspensionResult =
  | { outcome: AbuseSignalOutcome.SUSPENDED; level: number; endsAt: Date }
  | {
      outcome:
        | AbuseSignalOutcome.ALREADY_BLOCKED
        | AbuseSignalOutcome.PROTECTED_ACCOUNT
        | AbuseSignalOutcome.IGNORED;
    };

/** A suspension row as the repository returns it. */
export type AbuseSuspensionRow = {
  id: string;
  userId: string;
  level: number;
  reasonCode: string;
  evidence: unknown;
  startedAt: Date;
  endsAt: Date;
  liftedAt: Date | null;
  liftedByUserId: string | null;
};

/** A signal bucket as the repository returns it. */
export type AbuseSignalRow = {
  code: string;
  source: string;
  count: number;
  counted: boolean;
  bucketStart: Date;
};

/** The user columns the suspension decision reads. */
export type SuspendableUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
  bannedAt: Date | null;
  bannedUntil: Date | null;
};

/** What a new suspension writes: the ban columns and the audit row together. */
export type ApplySuspensionInput = {
  userId: string;
  level: number;
  reasonCode: AbuseSignalCode;
  evidence: AbuseEvidence;
  startedAt: Date;
  endsAt: Date;
  banReason: string;
};

/** What `GET /admin/users/:userId/abuse` returns. Counts and ids only. */
export type AdminAbuseView = {
  autoSuspendEnabled: boolean;
  suspensions: Array<{
    id: string;
    level: number;
    reasonCode: string;
    evidence: AbuseEvidence;
    startedAt: string;
    endsAt: string;
    liftedAt: string | null;
    liftedByUserId: string | null;
    active: boolean;
  }>;
  signals: Array<{
    code: string;
    source: string;
    count: number;
    counted: boolean;
    bucketStart: string;
  }>;
  /** Times this existing account signed in on a banned device; the flag an administrator reviews. */
  bannedDeviceSignins: number;
  tokenReuseEvents: number;
};

/** One device hash to mark as belonging to a permanently banned account. */
export type DeviceMarkInput = {
  kind: BannedDeviceHashKind;
  value: string;
  sourceUserId: string;
  reason: DeviceMarkReason;
};
