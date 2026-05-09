import { AutoSuggestSchedulerManager } from '../auto-suggest-scheduler.manager';

beforeAll(() => {
  process.env['WORKSPACE_DATABASE_URL'] = 'postgres://localhost/test';
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
  process.env['JWT_SECRET'] = 'a'.repeat(32);
  process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
  process.env['AUTO_SUGGEST_INBOX_REPLY_LOOKBACK_HOURS'] = '48';
});

type StubMessage = {
  id: string;
  userId: string;
  connectorId: string | null;
  externalId: string;
  title: string | null;
  provider: string;
  metadata: Record<string, unknown> | null;
  externalUpdatedAt: Date;
};

const makePrisma = (
  rows: StubMessage[],
): {
  workspaceObject: { findMany: jest.Mock };
} => ({
  workspaceObject: {
    findMany: jest.fn().mockResolvedValue(rows),
  },
});

const makeOrchestrator = (): { runJob: jest.Mock } => ({
  runJob: jest.fn(async (_job: string, collector: () => Promise<unknown[]>) => {
    return collector();
  }),
});

describe('AutoSuggestSchedulerManager.collectInboxReplyCandidates (12.2)', () => {
  it('emits a DRAFT candidate for fresh inbound (no "re:" prefix)', async () => {
    const orchestrator = makeOrchestrator();
    const prisma = makePrisma([
      {
        id: 'm1',
        userId: 'u1',
        connectorId: 'c1',
        externalId: 'gmail-1',
        title: 'Hi, can you check this PR?',
        provider: 'GMAIL',
        metadata: {},
        externalUpdatedAt: new Date(Date.now() - 60_000),
      },
    ]);
    const manager = new AutoSuggestSchedulerManager(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orchestrator as any,
    );
    await manager.triggerNow('INBOX_REPLY');
    const collected = await orchestrator.runJob.mock.results[0]?.value;
    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({
      userId: 'u1',
      provider: 'GMAIL',
      actionKind: 'DRAFT',
      sourceObjectId: 'm1',
    });
  });

  it('skips messages whose subject starts with "re:" (already a thread reply)', async () => {
    const orchestrator = makeOrchestrator();
    const prisma = makePrisma([
      {
        id: 'm2',
        userId: 'u1',
        connectorId: 'c1',
        externalId: 'gmail-2',
        title: 'Re: build is green',
        provider: 'GMAIL',
        metadata: {},
        externalUpdatedAt: new Date(Date.now() - 60_000),
      },
    ]);
    const manager = new AutoSuggestSchedulerManager(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orchestrator as any,
    );
    await manager.triggerNow('INBOX_REPLY');
    const collected = await orchestrator.runJob.mock.results[0]?.value;
    expect(collected).toHaveLength(0);
  });

  it('respects explicit needsReply flag in richMetadata even when subject starts with "re:"', async () => {
    const orchestrator = makeOrchestrator();
    const prisma = makePrisma([
      {
        id: 'm3',
        userId: 'u1',
        connectorId: 'c1',
        externalId: 'gmail-3',
        title: 'Re: contract — please confirm',
        provider: 'GMAIL',
        metadata: { needsReply: true } as Record<string, unknown>,
        externalUpdatedAt: new Date(Date.now() - 60_000),
      },
    ]);
    const manager = new AutoSuggestSchedulerManager(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orchestrator as any,
    );
    await manager.triggerNow('INBOX_REPLY');
    const collected = await orchestrator.runJob.mock.results[0]?.value;
    expect(collected).toHaveLength(1);
    expect(collected[0].sourceObjectId).toBe('m3');
  });

  it('returns [] when no Gmail messages match', async () => {
    const orchestrator = makeOrchestrator();
    const prisma = makePrisma([]);
    const manager = new AutoSuggestSchedulerManager(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orchestrator as any,
    );
    await manager.triggerNow('INBOX_REPLY');
    const collected = await orchestrator.runJob.mock.results[0]?.value;
    expect(collected).toEqual([]);
  });
});
