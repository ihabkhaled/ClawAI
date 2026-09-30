import type { PromptTemplateRecord } from '../../types/prompt-library.types';

type Row = PromptTemplateRecord;
interface Where {
  id?: string;
  userId?: string;
}

/** Just enough of the Prisma delegate to exercise the repository's where-clauses for real. */
export interface FakePromptTemplateStore {
  delegate: Record<string, (args: never) => Promise<unknown>>;
  seed: (
    userId: string,
    title: string,
    extra?: Partial<PromptTemplateRecord>,
  ) => PromptTemplateRecord;
  count: (userId: string) => number;
}

export function createFakePromptTemplateDelegate(): FakePromptTemplateStore {
  const rows: Row[] = [];
  let seq = 0;
  const matches = (row: Row, where: Where): boolean =>
    (where.id === undefined || row.id === where.id) &&
    (where.userId === undefined || row.userId === where.userId);

  const compare = (a: Row, b: Row): number => {
    const favouriteOrder = Number(b.isFavorite) - Number(a.isFavorite);
    if (favouriteOrder !== 0) {
      return favouriteOrder;
    }
    const at = a.lastUsedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const bt = b.lastUsedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    if (at !== bt) {
      return bt - at;
    }
    return a.updatedAt.getTime() !== b.updatedAt.getTime()
      ? b.updatedAt.getTime() - a.updatedAt.getTime()
      : a.id.localeCompare(b.id);
  };

  const seed = (userId: string, title: string, extra: Partial<Row> = {}): Row => {
    seq += 1;
    const row: Row = {
      id: `id-${String(seq).padStart(4, '0')}`,
      userId,
      title,
      body: 'Hello',
      tags: [],
      isFavorite: false,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: new Date('2026-09-30T10:00:00Z'),
      updatedAt: new Date('2026-09-30T10:00:00Z'),
      ...extra,
    };
    rows.push(row);
    return row;
  };

  const delegate = {
    count: ({ where }: { where: Where }) =>
      Promise.resolve(rows.filter((r) => matches(r, where)).length),
    create: ({ data }: { data: { userId: string; title: string } & Partial<Row> }) =>
      Promise.resolve(seed(data.userId, data.title, data)),
    findFirst: ({ where }: { where: Where }) =>
      Promise.resolve(rows.find((r) => matches(r, where)) ?? null),
    findMany: ({ where, skip, take }: { where: Where; skip: number; take: number }) =>
      Promise.resolve(
        rows
          .filter((r) => matches(r, where))
          .sort(compare)
          .slice(skip, skip + take),
      ),
    updateMany: ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
      const hit = rows.filter((r) => matches(r, where));
      for (const row of hit) {
        Object.assign(row, data, {
          usageCount: data.usageCount
            ? row.usageCount + (data.usageCount as { increment: number }).increment
            : row.usageCount,
        });
      }
      return Promise.resolve({ count: hit.length });
    },
    deleteMany: ({ where }: { where: Where }) => {
      const hit = rows.filter((r) => matches(r, where));
      for (const row of hit) {
        rows.splice(rows.indexOf(row), 1);
      }
      return Promise.resolve({ count: hit.length });
    },
  };

  return {
    delegate,
    seed,
    count: (userId: string) => rows.filter((r) => r.userId === userId).length,
  };
}
