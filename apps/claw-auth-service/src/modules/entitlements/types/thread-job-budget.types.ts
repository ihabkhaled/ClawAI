import { type Prisma } from '../../../generated/prisma';
import { type ThreadCallReserveOutcome } from '../../credit/enums/thread-call-reserve-outcome.enum';

/** The transaction client a SERIALIZABLE budget transaction works through. */
export type ThreadBudgetTx = Prisma.TransactionClient;

export type ThreadCallReserveInput = {
  budgetId: string;
  requestId: string;
  creditReservationId: string | null;
  amountMicroUsd: bigint;
};

/** What a detailed `calls/reserve` answer carries. All figures are integer micro-USD. */
export type ThreadCallReserveReply = {
  reserved: boolean;
  outcome: ThreadCallReserveOutcome;
  remainingMicroUsd: number;
};

/** What `reserveCall` decided, in a form the caller can map to an honest message. */
export type ThreadCallReserveResult = {
  outcome: ThreadCallReserveOutcome;
  /** Cap minus reserved minus spent, floored at zero, in integer micro-USD. */
  remainingMicroUsd: bigint;
  /** A credit hold this reservation replaced; the caller gives it back. */
  supersededCreditReservationId: string | null;
};

/** What the job has spent against its cap so far. All figures are integer micro-USD. */
export type ThreadJobBudgetSummary = {
  status: string;
  capMicroUsd: number;
  reservedMicroUsd: number;
  spentMicroUsd: number;
  remainingMicroUsd: number;
};

/** What `close` did in one transaction. */
export type ThreadBudgetCloseResult = {
  closed: boolean;
  /** Credit holds of the in-flight calls the close released. */
  releasedCreditReservationIds: string[];
};

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Extra Prisma codes worth another attempt. */
  extraCodes?: readonly string[];
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
};
