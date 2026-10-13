/**
 * An in-memory stand-in for the two Threads budget tables that behaves like a
 * SERIALIZABLE Postgres where it matters: a transaction works on a snapshot,
 * and when it commits after another transaction committed first, it is aborted
 * with Prisma's serialization failure (P2034). Every operation yields to the
 * event loop, so `Promise.all` of several transactions really interleaves and
 * really conflicts, which a mock returning canned values never would.
 */

type BudgetRow = {
  id: string;
  userId: string;
  requestId: string;
  capMicroUsd: bigint;
  reservedMicroUsd: bigint;
  spentMicroUsd: bigint;
  status: 'ACTIVE' | 'FINALIZED' | 'RELEASED';
  featureReservationIds: string[];
  createdAt: Date;
  settledAt: Date | null;
};

type CallRow = {
  id: string;
  budgetId: string;
  requestId: string;
  creditReservationId: string | null;
  reservedMicroUsd: bigint;
  settledMicroUsd: bigint | null;
  status: 'RESERVED' | 'FINALIZED' | 'RELEASED';
  createdAt: Date;
  settledAt: Date | null;
};

type Data = Record<string, unknown>;

export class SerializationFailure extends Error {
  readonly code = 'P2034';
}

export class UniqueViolation extends Error {
  readonly code = 'P2002';
}

type Counter = { increment?: bigint; decrement?: bigint };

type FakeTx = {
  threadJobBudget: {
    findUnique: (args: { where: Data }) => Promise<BudgetRow | null>;
    updateMany: (args: { where: Data; data: Data }) => Promise<{ count: number }>;
    update: (args: { where: Data; data: Data }) => Promise<BudgetRow>;
  };
  threadJobBudgetCall: {
    findUnique: (args: { where: Data }) => Promise<CallRow | null>;
    findMany: (args: { where: Data }) => Promise<CallRow[]>;
    create: (args: { data: Data }) => Promise<CallRow>;
    update: (args: { where: Data; data: Data }) => Promise<CallRow>;
    updateMany: (args: { where: Data; data: Data }) => Promise<{ count: number }>;
  };
};

/** Applies a Prisma-style update: plain values replace, { increment } and { decrement } adjust. */
function applyData(row: object, data: Data): void {
  for (const [key, value] of Object.entries(data)) {
    const current: unknown = Reflect.get(row, key);
    const isCounter = typeof value === 'object' && value !== null && !(value instanceof Date);
    const op: Counter = isCounter ? value : {};
    if (typeof current === 'bigint' && op.increment !== undefined) {
      Reflect.set(row, key, current + op.increment);
    } else if (typeof current === 'bigint' && op.decrement !== undefined) {
      Reflect.set(row, key, current - op.decrement);
    } else {
      Reflect.set(row, key, value);
    }
  }
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

export class FakeThreadBudgetDatabase {
  budgets = new Map<string, BudgetRow>();
  calls = new Map<string, CallRow>();
  /** How many transactions were aborted by a conflict, for assertions. */
  conflicts = 0;
  /** Fail the next N commits with a conflict regardless of interleaving. */
  forcedConflicts = 0;
  /** Fail every commit with this error when set. */
  failWith: (Error & { code?: string }) | null = null;
  private version = 0;
  private seq = 0;

  seedBudget(overrides: Partial<BudgetRow> = {}): BudgetRow {
    const row: BudgetRow = {
      id: `budget-${String(++this.seq)}`,
      userId: 'user-1',
      requestId: 'job-1',
      capMicroUsd: 1_000_000n,
      reservedMicroUsd: 0n,
      spentMicroUsd: 0n,
      status: 'ACTIVE',
      featureReservationIds: [],
      createdAt: new Date(),
      settledAt: null,
      ...overrides,
    };
    this.budgets.set(row.id, row);
    return row;
  }

  callsOf(budgetId: string): CallRow[] {
    return [...this.calls.values()].filter((call) => call.budgetId === budgetId);
  }

  /** The object the repository receives as `prisma`. */
  client(): { $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T> } {
    return {
      $transaction: <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => this.transaction(fn),
    };
  }

  private async transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    const startVersion = this.version;
    const budgets = new Map([...this.budgets].map(([id, row]) => [id, { ...row }]));
    const calls = new Map([...this.calls].map(([id, row]) => [id, { ...row }]));
    const result = await fn(this.tx(budgets, calls));
    await tick();
    if (this.failWith) {
      throw this.failWith;
    }
    if (this.forcedConflicts > 0 || this.version !== startVersion) {
      this.forcedConflicts = Math.max(0, this.forcedConflicts - 1);
      this.conflicts += 1;
      throw new SerializationFailure('write conflict or a deadlock');
    }
    this.budgets = budgets;
    this.calls = calls;
    this.version += 1;
    return result;
  }

  private tx(budgets: Map<string, BudgetRow>, calls: Map<string, CallRow>): FakeTx {
    const matchBudget = (where: Data): BudgetRow[] =>
      [...budgets.values()].filter(
        (row) =>
          (where['id'] === undefined || row.id === where['id']) &&
          (where['status'] === undefined || row.status === where['status']),
      );
    const matchCalls = (where: Data): CallRow[] =>
      [...calls.values()].filter((row) => {
        const ids = (where['id'] as { in?: string[] } | string | undefined) ?? undefined;
        const idOk =
          ids === undefined ||
          (typeof ids === 'string' ? row.id === ids : (ids.in ?? []).includes(row.id));
        return (
          idOk &&
          (where['budgetId'] === undefined || row.budgetId === where['budgetId']) &&
          (where['status'] === undefined || row.status === where['status'])
        );
      });
    return {
      threadJobBudget: {
        findUnique: async ({ where }: { where: Data }) => {
          await tick();
          const row = budgets.get(where['id'] as string);
          return row ? { ...row } : null;
        },
        updateMany: async ({ where, data }: { where: Data; data: Data }) => {
          await tick();
          const rows = matchBudget(where);
          for (const row of rows) applyData(row, data);
          return { count: rows.length };
        },
        update: async ({ where, data }: { where: Data; data: Data }) => {
          await tick();
          const row = budgets.get(where['id'] as string);
          if (!row) throw new Error('no budget');
          applyData(row, data);
          return { ...row };
        },
      },
      threadJobBudgetCall: {
        findUnique: async ({ where }: { where: Data }) => {
          await tick();
          const composite = where['budgetId_requestId'] as
            { budgetId: string; requestId: string } | undefined;
          const found = [...calls.values()].find((row) =>
            composite
              ? row.budgetId === composite.budgetId && row.requestId === composite.requestId
              : row.creditReservationId === where['creditReservationId'],
          );
          return found ? { ...found } : null;
        },
        findMany: async ({ where }: { where: Data }) => {
          await tick();
          return matchCalls(where).map((row) => ({ ...row }));
        },
        create: async ({ data }: { data: Data }) => {
          await tick();
          const duplicate = [...calls.values()].some(
            (row) => row.budgetId === data['budgetId'] && row.requestId === data['requestId'],
          );
          if (duplicate) throw new UniqueViolation('unique constraint');
          const row = {
            id: `call-${String(++this.seq)}`,
            settledMicroUsd: null,
            createdAt: new Date(),
            settledAt: null,
            ...data,
          } as CallRow;
          calls.set(row.id, row);
          return { ...row };
        },
        update: async ({ where, data }: { where: Data; data: Data }) => {
          await tick();
          const row = calls.get(where['id'] as string);
          if (!row) throw new Error('no call');
          applyData(row, data);
          return { ...row };
        },
        updateMany: async ({ where, data }: { where: Data; data: Data }) => {
          await tick();
          const rows = matchCalls(where);
          for (const row of rows) applyData(row, data);
          return { count: rows.length };
        },
      },
    };
  }
}
