import type { PaygHold } from '@claw/shared-entitlements';

import type { LiveCreditRefusal } from '../../../common/enums/live-credit-refusal.enum';
import type { LiveSettleOutcome } from '../../../common/enums/live-settle-outcome.enum';
import type {
  LiveChargeKind,
  LiveSessionState,
  LiveViewerSession,
  Prisma,
} from '../../../generated/prisma';
import type { LivePlanPolicy } from '../../policy/types/live-policy.types';

/** The session fields billing reads. A full LiveViewerSession row satisfies it. */
export type LiveBillableSession = Pick<
  LiveViewerSession,
  | 'id'
  | 'userId'
  | 'runId'
  | 'state'
  | 'paidApprovedAt'
  | 'spendingCapMicroUsd'
  | 'spentMicroUsd'
  | 'nextBlockIndex'
  | 'pendingSeconds'
>;

export interface LiveSettleOptions {
  /** Closing settlement: record charges but never change the session state (detach sets it). */
  final?: boolean;
}

export interface LiveSettleResult {
  outcome: LiveSettleOutcome;
  state: LiveSessionState;
}

/** Everything one settlement decides with, read once. */
export interface LiveSettleContext {
  policyVersion: number;
  plan: LivePlanPolicy;
  graceSeconds: number;
  month: string;
  now: Date;
  final: boolean;
}

/** One block being settled: which index, how many seconds. */
export interface LiveBlock {
  session: LiveBillableSession;
  blockIndex: number;
  seconds: number;
  key: string;
}

export interface LiveChargeInput {
  idempotencyKey: string;
  userId: string;
  sessionId: string;
  runId: string | null;
  kind: LiveChargeKind;
  seconds: number;
  microUsd: bigint;
  reservationId: string | null;
  policyVersion: number;
}

/** Fields applied to the session when a block is committed. */
export interface LiveSessionAdvance {
  sessionId: string;
  expectedBlockIndex: number;
  seconds: number;
  state?: LiveSessionState;
  spentMicroUsd?: bigint;
}

export type LiveTx = Prisma.TransactionClient;

export type LivePaidReserveResult =
  { held: true; hold: PaygHold } | { held: false; refusal: LiveCreditRefusal };

export interface LiveUsageView {
  month: string;
  freeSecondsTotal: number;
  freeSecondsUsed: number;
  paidMicroUsdPerMinute: number;
  graceSeconds: number;
  policyVersion: number;
}
