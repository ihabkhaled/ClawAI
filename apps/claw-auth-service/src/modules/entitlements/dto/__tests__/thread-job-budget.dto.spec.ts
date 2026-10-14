import { describe, expect, it } from 'vitest';

import { threadJobBudgetCallSchema, threadJobBudgetCloseSchema } from '../thread-job-budget.dto';

describe('thread job budget DTOs', () => {
  it('accepts Prisma CUID budget identifiers and UUID wallet reservations', () => {
    expect(
      threadJobBudgetCallSchema.safeParse({
        budgetId: 'clx12345678901234567890123',
        requestId: 'generation-request',
        creditReservationId: '00000000-0000-4000-8000-000000000001',
        amountMicroUsd: 10,
      }).success,
    ).toBe(true);
  });

  it('treats the detailed flag as optional, so an older meter keeps its boolean answer', () => {
    const base = {
      budgetId: 'clx12345678901234567890123',
      requestId: 'generation-request',
      creditReservationId: null,
      amountMicroUsd: 10,
    };
    expect(threadJobBudgetCallSchema.safeParse(base).success).toBe(true);
    expect(threadJobBudgetCallSchema.safeParse({ ...base, detailed: true }).success).toBe(true);
    expect(threadJobBudgetCallSchema.safeParse({ ...base, detailed: 'yes' }).success).toBe(false);
  });

  it('rejects a fractional or unsafe amount: money is integer micro-USD', () => {
    const base = {
      budgetId: 'clx12345678901234567890123',
      requestId: 'generation-request',
      creditReservationId: null,
    };
    expect(threadJobBudgetCallSchema.safeParse({ ...base, amountMicroUsd: 1.5 }).success).toBe(
      false,
    );
    expect(threadJobBudgetCallSchema.safeParse({ ...base, amountMicroUsd: 2 ** 53 }).success).toBe(
      false,
    );
    expect(threadJobBudgetCallSchema.safeParse({ ...base, amountMicroUsd: -1 }).success).toBe(
      false,
    );
  });

  it('accepts only supported close states and bounded CUID identifiers', () => {
    expect(
      threadJobBudgetCloseSchema.safeParse({
        budgetId: 'clx12345678901234567890123',
        status: 'FINALIZED',
      }).success,
    ).toBe(true);
    expect(
      threadJobBudgetCloseSchema.safeParse({ budgetId: 'x'.repeat(65), status: 'FINALIZED' })
        .success,
    ).toBe(false);
  });

  it('accepts PLATFORM_FAILED and still rejects an unknown close state', () => {
    const budgetId = 'clx12345678901234567890123';
    expect(
      threadJobBudgetCloseSchema.safeParse({ budgetId, status: 'PLATFORM_FAILED' }).success,
    ).toBe(true);
    expect(threadJobBudgetCloseSchema.safeParse({ budgetId, status: 'FAILED' }).success).toBe(
      false,
    );
  });
});
