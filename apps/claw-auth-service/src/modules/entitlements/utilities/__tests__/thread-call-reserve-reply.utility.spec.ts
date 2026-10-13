import { describe, expect, it } from 'vitest';

import { ThreadCallReserveOutcome } from '../../../credit/enums/thread-call-reserve-outcome.enum';
import {
  isThreadCallProceedable,
  toThreadCallReserveReply,
} from '../thread-call-reserve-reply.utility';

const result = (outcome: ThreadCallReserveOutcome, remainingMicroUsd = 0n) => ({
  outcome,
  remainingMicroUsd,
  supersededCreditReservationId: null,
});

describe('isThreadCallProceedable', () => {
  it('lets only a fresh or repeated reservation proceed', () => {
    const proceed = Object.values(ThreadCallReserveOutcome).filter(isThreadCallProceedable);
    expect(proceed.sort()).toEqual(['ALREADY_RESERVED', 'RESERVED']);
  });
});

describe('toThreadCallReserveReply', () => {
  it('answers the bare boolean an older meter understands', () => {
    expect(toThreadCallReserveReply(result(ThreadCallReserveOutcome.RESERVED), false)).toBe(true);
    expect(toThreadCallReserveReply(result(ThreadCallReserveOutcome.CAP_EXCEEDED), false)).toBe(
      false,
    );
    expect(
      toThreadCallReserveReply(result(ThreadCallReserveOutcome.ALREADY_FINALIZED), false),
    ).toBe(false);
  });

  it('answers the outcome and what is left when asked for detail', () => {
    expect(
      toThreadCallReserveReply(result(ThreadCallReserveOutcome.CAP_EXCEEDED, 250n), true),
    ).toEqual({ reserved: false, outcome: 'CAP_EXCEEDED', remainingMicroUsd: 250 });
  });

  it('keeps the remaining figure a safe integer', () => {
    const reply = toThreadCallReserveReply(
      result(ThreadCallReserveOutcome.RESERVED, 2n ** 70n),
      true,
    );
    expect(reply).toMatchObject({ reserved: true, remainingMicroUsd: Number.MAX_SAFE_INTEGER });
  });
});
