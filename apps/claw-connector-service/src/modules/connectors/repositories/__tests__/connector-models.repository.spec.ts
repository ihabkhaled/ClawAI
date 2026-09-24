import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConnectorModelsRepository } from '../connector-models.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

const buildModel = (
  key: string,
): {
  modelKey: string;
  displayName: string;
  lifecycle: string;
  capabilities: {
    supportsStreaming: boolean;
    supportsTools: boolean;
    supportsVision: boolean;
    supportsAudio: boolean;
    supportsVideoInput: boolean;
    supportsStructuredOutput: boolean;
    maxContextTokens: number | null;
  };
} => ({
  modelKey: key,
  displayName: key.toUpperCase(),
  lifecycle: 'ACTIVE',
  capabilities: {
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideoInput: false,
    supportsStructuredOutput: false,
    maxContextTokens: 8000,
  },
});

describe('ConnectorModelsRepository', () => {
  let repository: ConnectorModelsRepository;
  let prismaMock: {
    connectorModel: {
      upsert: Mock;
      findMany: Mock;
      deleteMany: Mock;
      updateMany: Mock;
      count: Mock;
    };
    $transaction: Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      connectorModel: {
        upsert: vi.fn().mockResolvedValue({ id: 'm1' }),
        findMany: vi.fn().mockResolvedValue([{ id: 'm1' }]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(3),
      },
      $transaction: vi
        .fn()
        .mockImplementation((ops: unknown[]) => Promise.resolve(ops.map(() => ({})))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConnectorModelsRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<ConnectorModelsRepository>(ConnectorModelsRepository);
  });

  describe('upsertMany', () => {
    it('returns number of upserted models', async () => {
      const result = await repository.upsertMany('c1', 'OPENAI' as never, [
        buildModel('gpt-4') as never,
        buildModel('gpt-3.5') as never,
      ]);
      expect(result).toBe(2);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('replaceMany', () => {
    it('marks models missing from the sync as REMOVED instead of deleting them', async () => {
      prismaMock.$transaction = vi
        .fn()
        .mockResolvedValue([{ count: 5 }, { id: 'm1' }, { id: 'm2' }]);
      const result = await repository.replaceMany('c1', 'OPENAI' as never, [
        buildModel('gpt-4') as never,
        buildModel('gpt-3.5') as never,
      ]);
      expect(result).toEqual({ upserted: 2, deleted: 5 });
      expect(prismaMock.connectorModel.updateMany).toHaveBeenCalledWith({
        where: {
          connectorId: 'c1',
          modelKey: { notIn: ['gpt-4', 'gpt-3.5'] },
          lifecycle: { not: 'REMOVED' },
        },
        data: { lifecycle: 'REMOVED', exposure: 'UNEXPOSED' },
      });
      expect(prismaMock.connectorModel.deleteMany).not.toHaveBeenCalled();
    });

    it('deduplicates models by modelKey', async () => {
      prismaMock.$transaction = vi.fn().mockResolvedValue([{ count: 0 }, { id: 'm1' }]);
      const result = await repository.replaceMany('c1', 'OPENAI' as never, [
        buildModel('gpt-4') as never,
        buildModel('gpt-4') as never,
        buildModel('gpt-4') as never,
      ]);
      expect(result.upserted).toBe(1);
    });

    it('still marks removals when the provider returns no models', async () => {
      prismaMock.$transaction = vi.fn().mockResolvedValue([{ count: 7 }]);
      const result = await repository.replaceMany('c1', 'OPENAI' as never, []);
      expect(result).toEqual({ upserted: 0, deleted: 7 });
      expect(prismaMock.connectorModel.updateMany).toHaveBeenCalledWith({
        where: {
          connectorId: 'c1',
          lifecycle: { not: 'REMOVED' },
        },
        data: { lifecycle: 'REMOVED', exposure: 'UNEXPOSED' },
      });
      const updateManyCall = prismaMock.connectorModel.updateMany.mock.calls[0];
      expect(updateManyCall).toBeDefined();
      expect(
        (
          updateManyCall?.[0] as {
            where: Record<string, unknown>;
          }
        ).where,
      ).not.toHaveProperty('modelKey');
    });

    it('records lastSeenAt on both the update and create branches of the upsert', async () => {
      prismaMock.$transaction = vi.fn().mockResolvedValue([{ count: 0 }, { id: 'm1' }]);
      await repository.replaceMany('c1', 'OPENAI' as never, [buildModel('gpt-4') as never]);
      const upsertArgsCall = prismaMock.connectorModel.upsert.mock.calls[0];
      expect(upsertArgsCall).toBeDefined();
      const upsertArgs = upsertArgsCall?.[0] as {
        update: Record<string, unknown>;
        create: Record<string, unknown>;
      };
      expect(upsertArgs.update.lastSeenAt).toBeInstanceOf(Date);
      expect(upsertArgs.create.lastSeenAt).toBeInstanceOf(Date);
      expect(upsertArgs.create).not.toHaveProperty('exposure');
      expect(upsertArgs.create).not.toHaveProperty('kind');
    });
  });

  it('replaceMany overwrites capability flags on already-existing rows (update branch)', async () => {
    prismaMock.$transaction = vi.fn().mockResolvedValue([{ count: 0 }, { id: 'm1' }]);
    const model = buildModel('gemini-audio');
    model.capabilities.supportsAudio = true;
    await repository.replaceMany('c1', 'GEMINI' as never, [model as never]);
    const args = prismaMock.connectorModel.upsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
    };
    expect(args.update.supportsAudio).toBe(true);
    expect(args.update.supportsVision).toBe(false);
  });

  it('replaceMany writes supportsVideoInput on the create branch', async () => {
    prismaMock.$transaction = vi.fn().mockResolvedValue([{ count: 0 }, { id: 'm1' }]);
    const model = buildModel('models/gemini-2.5-flash');
    model.capabilities.supportsVideoInput = true;
    await repository.replaceMany('c1', 'GEMINI' as never, [model as never]);
    const args = prismaMock.connectorModel.upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
    };
    expect(args.create.supportsVideoInput).toBe(true);
  });

  // A resync must be able to turn the flag OFF too — a heuristic narrowed
  // after release has to reach rows that were created under the old rule.
  it('replaceMany overwrites supportsVideoInput on resync (update branch), both directions', async () => {
    prismaMock.$transaction = vi.fn().mockResolvedValue([{ count: 0 }, { id: 'm1' }]);
    const on = buildModel('models/gemini-2.5-pro');
    on.capabilities.supportsVideoInput = true;
    const off = buildModel('models/gemini-2.5-flash-image');
    await repository.replaceMany('c1', 'GEMINI' as never, [on as never, off as never]);
    const calls = prismaMock.connectorModel.upsert.mock.calls as Array<
      [{ update: Record<string, unknown> }]
    >;
    expect(calls[0]?.[0].update.supportsVideoInput).toBe(true);
    expect(calls[1]?.[0].update.supportsVideoInput).toBe(false);
  });

  it('upsertMany writes supportsVideoInput on both create and update', async () => {
    const model = buildModel('models/gemini-2.0-flash');
    model.capabilities.supportsVideoInput = true;
    await repository.upsertMany('c1', 'GEMINI' as never, [model as never]);
    const args = prismaMock.connectorModel.upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(args.create.supportsVideoInput).toBe(true);
    expect(args.update.supportsVideoInput).toBe(true);
  });

  it('findByConnectorId orders by displayName asc', async () => {
    await repository.findByConnectorId('c1');
    expect(prismaMock.connectorModel.findMany).toHaveBeenCalledWith({
      where: { connectorId: 'c1' },
      orderBy: { displayName: 'asc' },
    });
  });

  it('deleteByConnectorId returns prisma count', async () => {
    prismaMock.connectorModel.deleteMany = vi.fn().mockResolvedValue({ count: 4 });
    const result = await repository.deleteByConnectorId('c1');
    expect(result).toBe(4);
  });

  it('countByConnectorId returns prisma count', async () => {
    const result = await repository.countByConnectorId('c1');
    expect(result).toBe(3);
  });
});
