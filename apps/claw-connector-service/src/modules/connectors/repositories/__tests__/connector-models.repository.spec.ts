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
    supportsStructuredOutput: false,
    maxContextTokens: 8000,
  },
});

describe('ConnectorModelsRepository', () => {
  let repository: ConnectorModelsRepository;
  let prismaMock: {
    connectorModel: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      connectorModel: {
        upsert: jest.fn().mockResolvedValue({ id: 'm1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'm1' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(3),
      },
      $transaction: jest
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
    it('deletes models not in the new list and upserts the rest', async () => {
      prismaMock.$transaction = jest
        .fn()
        .mockResolvedValue([{ count: 5 }, { id: 'm1' }, { id: 'm2' }]);
      const result = await repository.replaceMany('c1', 'OPENAI' as never, [
        buildModel('gpt-4') as never,
        buildModel('gpt-3.5') as never,
      ]);
      expect(result).toEqual({ upserted: 2, deleted: 5 });
    });

    it('deduplicates models by modelKey', async () => {
      prismaMock.$transaction = jest.fn().mockResolvedValue([{ count: 0 }, { id: 'm1' }]);
      const result = await repository.replaceMany('c1', 'OPENAI' as never, [
        buildModel('gpt-4') as never,
        buildModel('gpt-4') as never,
        buildModel('gpt-4') as never,
      ]);
      expect(result.upserted).toBe(1);
    });

    it('skips notIn filter when no models supplied', async () => {
      prismaMock.$transaction = jest.fn().mockResolvedValue([{ count: 7 }]);
      const result = await repository.replaceMany('c1', 'OPENAI' as never, []);
      expect(result).toEqual({ upserted: 0, deleted: 7 });
    });
  });

  it('findByConnectorId orders by displayName asc', async () => {
    await repository.findByConnectorId('c1');
    expect(prismaMock.connectorModel.findMany).toHaveBeenCalledWith({
      where: { connectorId: 'c1' },
      orderBy: { displayName: 'asc' },
    });
  });

  it('deleteByConnectorId returns prisma count', async () => {
    prismaMock.connectorModel.deleteMany = jest.fn().mockResolvedValue({ count: 4 });
    const result = await repository.deleteByConnectorId('c1');
    expect(result).toBe(4);
  });

  it('countByConnectorId returns prisma count', async () => {
    const result = await repository.countByConnectorId('c1');
    expect(result).toBe(3);
  });
});
