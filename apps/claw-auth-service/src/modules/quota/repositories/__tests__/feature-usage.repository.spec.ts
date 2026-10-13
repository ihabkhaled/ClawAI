import {
  FeatureUsageState,
  PlanFeatureKey,
  PlanFeatureWindow,
  type Prisma,
} from '../../../../generated/prisma';
import { FeatureUsageRepository } from '../feature-usage.repository';

type Row = {
  id: string;
  userId: string;
  planId: string | null;
  feature: PlanFeatureKey;
  window: PlanFeatureWindow;
  periodKey: string;
  requestId: string;
  state: FeatureUsageState;
  reservedAt: Date;
  consumedAt: Date | null;
  releasedAt: Date | null;
};

type UniqueWhere = {
  userId_feature_requestId: { userId: string; feature: string; requestId: string };
};

// An in-memory stand-in for the three things reserveWithinLimit touches. Every
// operation yields to the event loop, so concurrent reserves really interleave. When
// `enforceLock` is on, $executeRaw models pg_advisory_xact_lock: a second
// transaction asking for the same key waits until the first one's callback returns.
// With it off the fake models a database that serialises nothing, which is the
// control that proves the interleaving test can fail.
const buildFake = (options: { enforceLock: boolean; seed?: Row[] }) => {
  const rows: Row[] = [...(options.seed ?? [])];
  const lockTails = new Map<string, Promise<void>>();
  const lockKeysTaken: string[][] = [];
  let sequence = 0;
  const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

  const makeTx = (onLock: (key: string) => Promise<void>) => ({
    $executeRaw: async (sql: Prisma.Sql) => {
      const values = sql.values.map(String);
      lockKeysTaken.push(values);
      await onLock(values.join(':'));
      return 1;
    },
    featureUsageRecord: {
      findUnique: async ({ where }: { where: UniqueWhere }) => {
        await tick();
        const key = where.userId_feature_requestId;
        return (
          rows.find(
            (r) =>
              r.userId === key.userId && r.feature === key.feature && r.requestId === key.requestId,
          ) ?? null
        );
      },
      count: async ({
        where,
      }: {
        where: { userId: string; feature: string; periodKey: string; state: { in: string[] } };
      }) => {
        await tick();
        return rows.filter(
          (r) =>
            r.userId === where.userId &&
            r.feature === where.feature &&
            r.periodKey === where.periodKey &&
            where.state.in.includes(r.state),
        ).length;
      },
      create: async ({ data }: { data: Partial<Row> }) => {
        await tick();
        sequence += 1;
        const created = {
          id: `row-${sequence}`,
          consumedAt: null,
          releasedAt: null,
          reservedAt: new Date(),
          ...data,
        } as Row;
        rows.push(created);
        return created;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        await tick();
        const found = rows.find((r) => r.id === where.id) as Row;
        Object.assign(found, data);
        return found;
      },
    },
  });

  const prisma = {
    $transaction: async <T>(run: (tx: ReturnType<typeof makeTx>) => Promise<T>): Promise<T> => {
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const tx = makeTx(async (key) => {
        if (!options.enforceLock) {
          return;
        }
        const previous = lockTails.get(key) ?? Promise.resolve();
        lockTails.set(key, held);
        await previous;
      });
      try {
        return await run(tx);
      } finally {
        release();
      }
    },
  };
  return { repository: new FeatureUsageRepository(prisma as never), rows, lockKeysTaken };
};

const row = (overrides: Partial<Row>): Row => ({
  id: 'seed-1',
  userId: 'u1',
  planId: 'free',
  feature: PlanFeatureKey.PLUGIN_CALLS,
  window: PlanFeatureWindow.DAY,
  periodKey: '2026-10-13',
  requestId: 'seed-req',
  state: FeatureUsageState.RESERVED,
  reservedAt: new Date('2026-10-13T00:00:00Z'),
  consumedAt: null,
  releasedAt: null,
  ...overrides,
});

const reserveParams = (requestId: string, limit: number | null) => ({
  userId: 'u1',
  planId: 'free',
  feature: PlanFeatureKey.PLUGIN_CALLS,
  window: PlanFeatureWindow.DAY,
  periodKey: '2026-10-13',
  requestId,
  limit,
});

const reserveMany = (repository: FeatureUsageRepository, count: number, limit: number) =>
  Promise.all(
    Array.from({ length: count }, (_, i) =>
      repository.reserveWithinLimit(reserveParams(`c-${i}`, limit)),
    ),
  );

describe('FeatureUsageRepository.reserveWithinLimit', () => {
  describe('concurrency', () => {
    it('never lets concurrent reserves overshoot the cap when the advisory lock serialises them', async () => {
      const { repository, rows } = buildFake({ enforceLock: true });

      const outcomes = await reserveMany(repository, 8, 3);

      expect(outcomes.filter((o) => o.held)).toHaveLength(3);
      const refused = outcomes.filter((o) => !o.held);
      expect(refused).toHaveLength(5);
      for (const outcome of refused) {
        expect(outcome).toEqual({ held: false, used: 3 });
      }
      expect(rows).toHaveLength(3);
    });

    it('control: without the lock the same interleaving overshoots, so the test above can fail', async () => {
      const { repository, rows } = buildFake({ enforceLock: false });

      await reserveMany(repository, 8, 3);

      expect(rows.length).toBeGreaterThan(3);
    });

    it('locks on the user and the feature key, as the hash input', async () => {
      const { repository, lockKeysTaken } = buildFake({ enforceLock: true });

      await repository.reserveWithinLimit(reserveParams('k-1', 3));

      expect(lockKeysTaken).toEqual([['u1', 'PLUGIN_CALLS']]);
    });
  });

  describe('retry semantics', () => {
    it('returns a RESERVED requestId as is, without re-checking the cap', async () => {
      const mine = row({ id: 'mine', requestId: 'r1' });
      const other = row({ id: 'other', requestId: 'r2' });
      const { repository, rows } = buildFake({ enforceLock: true, seed: [mine, other] });

      // limit 1 with two active rows: a cap check would refuse; the retry must not.
      const outcome = await repository.reserveWithinLimit(reserveParams('r1', 1));

      expect(outcome).toMatchObject({ held: true, record: { id: 'mine' } });
      expect(rows).toHaveLength(2);
    });

    it('returns a CONSUMED requestId as is, without a second run', async () => {
      const spent = row({ id: 'spent', requestId: 'r1', state: FeatureUsageState.CONSUMED });
      const { repository, rows } = buildFake({ enforceLock: true, seed: [spent] });

      const outcome = await repository.reserveWithinLimit(reserveParams('r1', 1));

      expect(outcome).toMatchObject({ held: true, record: { id: 'spent', state: 'CONSUMED' } });
      expect(rows).toHaveLength(1);
    });

    it('revives a RELEASED requestId to RESERVED when the cap has room', async () => {
      const released = row({
        id: 'freed',
        requestId: 'r1',
        state: FeatureUsageState.RELEASED,
        releasedAt: new Date('2026-10-13T01:00:00Z'),
      });
      const { repository, rows } = buildFake({ enforceLock: true, seed: [released] });

      const outcome = await repository.reserveWithinLimit(reserveParams('r1', 1));

      expect(outcome).toMatchObject({
        held: true,
        record: { id: 'freed', state: 'RESERVED', releasedAt: null },
      });
      expect(rows).toHaveLength(1);
    });

    it('refuses to revive a RELEASED requestId once the freed slot was taken', async () => {
      const released = row({
        id: 'freed',
        requestId: 'r1',
        state: FeatureUsageState.RELEASED,
        releasedAt: new Date('2026-10-13T01:00:00Z'),
      });
      const taken = row({ id: 'taken', requestId: 'r2' });
      const { repository, rows } = buildFake({ enforceLock: true, seed: [released, taken] });

      const outcome = await repository.reserveWithinLimit(reserveParams('r1', 1));

      expect(outcome).toEqual({ held: false, used: 1 });
      expect(rows.find((r) => r.id === 'freed')?.state).toBe(FeatureUsageState.RELEASED);
    });

    it('does not count RELEASED rows toward the cap for a new request', async () => {
      const released = row({ id: 'freed', state: FeatureUsageState.RELEASED });
      const { repository } = buildFake({ enforceLock: true, seed: [released] });

      await expect(repository.reserveWithinLimit(reserveParams('new', 1))).resolves.toMatchObject({
        held: true,
      });
    });
  });

  describe('uncapped and new requests', () => {
    it('skips the cap for an unlimited rule (limit null)', async () => {
      const seed = Array.from({ length: 5 }, (_, i) => row({ id: `s-${i}`, requestId: `s-${i}` }));
      const { repository, rows } = buildFake({ enforceLock: true, seed });

      const outcome = await repository.reserveWithinLimit(reserveParams('free-run', null));

      expect(outcome).toMatchObject({ held: true });
      expect(rows).toHaveLength(6);
    });

    it('refuses everything at limit 0 without writing a row', async () => {
      const { repository, rows } = buildFake({ enforceLock: true });

      await expect(repository.reserveWithinLimit(reserveParams('r1', 0))).resolves.toEqual({
        held: false,
        used: 0,
      });
      expect(rows).toHaveLength(0);
    });

    it('creates a RESERVED row carrying the plan, window and period', async () => {
      const { repository, rows } = buildFake({ enforceLock: true });

      await repository.reserveWithinLimit(reserveParams('r1', 5));

      expect(rows[0]).toMatchObject({
        userId: 'u1',
        planId: 'free',
        feature: 'PLUGIN_CALLS',
        window: 'DAY',
        periodKey: '2026-10-13',
        requestId: 'r1',
        state: 'RESERVED',
      });
    });

    it('counts only the requested period', async () => {
      const yesterday = row({ id: 'old', periodKey: '2026-10-12' });
      const { repository } = buildFake({ enforceLock: true, seed: [yesterday] });

      await expect(repository.reserveWithinLimit(reserveParams('r1', 1))).resolves.toMatchObject({
        held: true,
      });
    });
  });
});
