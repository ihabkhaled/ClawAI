import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type RabbitMQService } from '@claw/shared-rabbitmq';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EntityNotFoundException } from '../../../common/errors';
import { ConnectorsController } from '../controllers/connectors.controller';
import { setModelPromptCachingSchema } from '../dto/set-model-prompt-caching.dto';
import { type ConnectorsManager } from '../managers/connectors.manager';
import { ModelsSnapshotManager } from '../managers/models-snapshot.manager';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { type ConnectorsRepository } from '../repositories/connectors.repository';
import { ConnectorsService } from '../services/connectors.service';

/**
 * F093: the per-model prompt-caching switch. It changes what a request costs (a
 * cache write is billed at a premium), so it is default OFF, ANTHROPIC-only,
 * administrator-set, bounded, and travels to chat-service on the models snapshot.
 */

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }) },
}));
vi.mock('../../../common/utilities', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  verifyAccessToken: vi.fn(),
}));

describe('setModelPromptCachingSchema', () => {
  it('accepts a bounded key list and a boolean', () => {
    expect(
      setModelPromptCachingSchema.safeParse({ modelKeys: ['claude-sonnet-4'], enabled: true })
        .success,
    ).toBe(true);
  });

  it.each([
    ['no keys', { modelKeys: [], enabled: true }],
    [
      'too many keys',
      { modelKeys: Array.from({ length: 201 }, (_, i) => `m${String(i)}`), enabled: true },
    ],
    ['an empty key', { modelKeys: [''], enabled: true }],
    ['an over-long key', { modelKeys: ['x'.repeat(129)], enabled: true }],
    ['a non-boolean flag', { modelKeys: ['m'], enabled: 'true' }],
    ['a missing flag', { modelKeys: ['m'] }],
  ])('rejects %s', (_name, body) => {
    expect(setModelPromptCachingSchema.safeParse(body).success).toBe(false);
  });
});

describe('ConnectorModelsRepository.setPromptCaching', () => {
  let repository: ConnectorModelsRepository;
  let updateMany: Mock;

  beforeEach(async () => {
    updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectorModelsRepository,
        { provide: PrismaService, useValue: { connectorModel: { updateMany } } },
      ],
    }).compile();
    repository = module.get(ConnectorModelsRepository);
  });

  it('touches only existing, non-removed ANTHROPIC rows of that connector', async () => {
    const result = await repository.setPromptCaching('c1', ['claude-sonnet-4', 'gpt-5'], true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        connectorId: 'c1',
        provider: 'ANTHROPIC',
        modelKey: { in: ['claude-sonnet-4', 'gpt-5'] },
        lifecycle: { not: 'REMOVED' },
      },
      data: { promptCaching: true },
    });
    expect(result).toEqual({ updated: 2 });
  });

  it('switches off with the same guard', async () => {
    await repository.setPromptCaching('c1', ['claude-sonnet-4'], false);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { promptCaching: false } }),
    );
  });

  it('reports zero updated for a forged key rather than creating a row', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.setPromptCaching('c1', ['nope'], true)).resolves.toEqual({
      updated: 0,
    });
  });
});

describe('ConnectorsService.setModelPromptCaching', () => {
  let connectorsRepo: { findById: Mock };
  let modelsRepo: { setPromptCaching: Mock };
  let service: ConnectorsService;

  beforeEach(() => {
    connectorsRepo = { findById: vi.fn().mockResolvedValue({ id: 'c1', provider: 'ANTHROPIC' }) };
    modelsRepo = { setPromptCaching: vi.fn().mockResolvedValue({ updated: 1 }) };
    service = new ConnectorsService(
      connectorsRepo as unknown as ConnectorsRepository,
      modelsRepo as unknown as ConnectorModelsRepository,
      {} as unknown as ConnectorsManager,
      { publish: vi.fn().mockResolvedValue(undefined) } as unknown as RabbitMQService,
    );
  });

  it('switches the models and returns the count', async () => {
    await expect(service.setModelPromptCaching('c1', ['claude-sonnet-4'], true)).resolves.toEqual({
      updated: 1,
    });
    expect(modelsRepo.setPromptCaching).toHaveBeenCalledWith('c1', ['claude-sonnet-4'], true);
  });

  it('fails as NOT FOUND for an unknown connector and writes nothing', async () => {
    connectorsRepo.findById.mockResolvedValue(null);
    await expect(service.setModelPromptCaching('nope', ['m'], true)).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    expect(modelsRepo.setPromptCaching).not.toHaveBeenCalled();
  });
});

describe('ConnectorsController.setModelPromptCaching', () => {
  it('forwards the connector id, keys and flag to the service', async () => {
    const serviceMock = { setModelPromptCaching: vi.fn().mockResolvedValue({ updated: 2 }) };
    const module = await Test.createTestingModule({
      controllers: [ConnectorsController],
      providers: [{ provide: ConnectorsService, useValue: serviceMock }],
    }).compile();

    const result = await module
      .get(ConnectorsController)
      .setModelPromptCaching('c1', { modelKeys: ['a', 'b'], enabled: true });

    expect(serviceMock.setModelPromptCaching).toHaveBeenCalledWith('c1', ['a', 'b'], true);
    expect(result).toEqual({ updated: 2 });
  });
});

describe('ModelsSnapshotManager: promptCaching', () => {
  function build(rows: Array<Record<string, unknown>>): ModelsSnapshotManager {
    return new ModelsSnapshotManager({
      findAllForSnapshot: vi.fn().mockResolvedValue(rows),
    } as unknown as ConnectorModelsRepository);
  }

  const row = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    provider: 'ANTHROPIC',
    modelKey: 'claude-sonnet-4',
    displayName: 'Claude Sonnet 4',
    supportsVision: false,
    supportsAudio: false,
    supportsVideoInput: false,
    maxContextTokens: 200_000,
    exposure: 'EXPOSED',
    kind: 'CHAT',
    promptCaching: false,
    ...overrides,
  });

  it('publishes the switch exactly as stored', async () => {
    const result = await build([
      row({ modelKey: 'on', promptCaching: true }),
      row({ modelKey: 'off', promptCaching: false }),
    ]).build();
    expect(result.models.map((m) => [m.modelKey, m.promptCaching])).toEqual([
      ['on', true],
      ['off', false],
    ]);
  });

  it('defaults a row to OFF', async () => {
    const result = await build([row()]).build();
    expect(result.models[0]?.promptCaching).toBe(false);
  });
});
