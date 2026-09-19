import { vi } from 'vitest';

import { AssistantModelRole, RouterProvider } from '../../../generated/prisma';
import { AssistantModelRepository } from '../repositories/assistant-model.repository';

const entry = (role: AssistantModelRole, order: number) => ({
  role,
  order,
  provider: RouterProvider.OLLAMA_CLOUD,
  modelAlias: `m${String(order)}`,
  timeoutMs: 1_000,
  maxTokens: 64,
});

function prismaWith(countsByRole: Record<string, number>) {
  const createMany = vi.fn(async () => Promise.resolve({ count: 0 }));
  const tx = {
    $executeRaw: vi.fn(async () => Promise.resolve(0)),
    assistantModel: {
      count: vi.fn(async ({ where }: { where: { role: string } }) =>
        Promise.resolve(countsByRole[where.role] ?? 0),
      ),
      createMany,
    },
  };
  const prisma = { $transaction: async (fn: (t: typeof tx) => Promise<boolean>) => fn(tx) };
  return { prisma, createMany };
}

const ENTRIES = [
  entry(AssistantModelRole.RESEARCH_GATE, 1),
  entry(AssistantModelRole.FILE_WRITER, 1),
  entry(AssistantModelRole.FILE_WRITER, 2),
];

describe('AssistantModelRepository.seedOnce', () => {
  // A role added after the first seed (FILE_WRITER) never seeded, because the
  // old check counted every role together and RESEARCH_GATE already had rows.
  it('seeds a new role even when an older role is already configured', async () => {
    const { prisma, createMany } = prismaWith({ RESEARCH_GATE: 3 });

    const seeded = await new AssistantModelRepository(prisma as never).seedOnce(ENTRIES);

    expect(seeded).toBe(true);
    const data = (createMany.mock.calls[0] as unknown[] | undefined)?.[0] as {
      data: Array<{ role: string }>;
    };
    expect(data.data.map((row) => row.role)).toEqual(['FILE_WRITER', 'FILE_WRITER']);
  });

  it('never touches a role an admin already configured', async () => {
    const { prisma, createMany } = prismaWith({ RESEARCH_GATE: 3, FILE_WRITER: 1 });

    await expect(new AssistantModelRepository(prisma as never).seedOnce(ENTRIES)).resolves.toBe(
      false,
    );
    expect(createMany).not.toHaveBeenCalled();
  });

  it('seeds every role on a fresh database', async () => {
    const { prisma, createMany } = prismaWith({});

    await new AssistantModelRepository(prisma as never).seedOnce(ENTRIES);

    const data = (createMany.mock.calls[0] as unknown[] | undefined)?.[0] as {
      data: unknown[];
    };
    expect(data.data).toHaveLength(3);
  });
});
