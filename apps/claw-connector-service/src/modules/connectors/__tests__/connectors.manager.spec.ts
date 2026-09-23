import { type Mock, vi } from 'vitest';
import { BusinessException } from '../../../common/errors';
import { ConnectorsManager } from '../managers/connectors.manager';
import { type ConnectorsRepository } from '../repositories/connectors.repository';
import { type ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { type HealthEventsRepository } from '../repositories/health-events.repository';
import { type SyncRunsRepository } from '../repositories/sync-runs.repository';
import {
  ConnectorAuthType,
  ConnectorProvider,
  ConnectorStatus,
  ModelSyncStatus,
} from '../../../generated/prisma';

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn().mockReturnValue({
      ENCRYPTION_KEY: 'a'.repeat(64),
    }),
  },
}));

vi.mock('../../../common/utilities', () => ({
  encrypt: vi.fn().mockReturnValue('encrypted'),
  decrypt: vi.fn().mockReturnValue('sk-test-key'),
  verifyAccessToken: vi.fn(),
}));

const mockOpenAIModelsResponse = {
  object: 'list',
  data: [
    { id: 'gpt-4o', object: 'model', created: 1700000000, owned_by: 'openai' },
    { id: 'gpt-4o-mini', object: 'model', created: 1700000000, owned_by: 'openai' },
    { id: 'gpt-3.5-turbo', object: 'model', created: 1700000000, owned_by: 'openai' },
    { id: 'dall-e-3', object: 'model', created: 1700000000, owned_by: 'openai' },
  ],
};

const mockAnthropicModelsResponse = {
  data: [
    { type: 'model', id: 'claude-opus-4', display_name: 'Claude Opus 4', created_at: '2025-01-01' },
    {
      type: 'model',
      id: 'claude-sonnet-4',
      display_name: 'Claude Sonnet 4',
      created_at: '2025-01-01',
    },
    {
      type: 'model',
      id: 'claude-haiku-3.5',
      display_name: 'Claude Haiku 3.5',
      created_at: '2025-01-01',
    },
  ],
  has_more: false,
  first_id: null,
  last_id: null,
};

const mockGrokModelsResponse = {
  object: 'list',
  data: [
    { id: 'grok-3', object: 'model', created: 1700000000, owned_by: 'xai' },
    { id: 'grok-3-mini', object: 'model', created: 1700000000, owned_by: 'xai' },
    { id: 'grok-3-fast', object: 'model', created: 1700000000, owned_by: 'xai' },
    { id: 'grok-2-vision-1212', object: 'model', created: 1700000000, owned_by: 'xai' },
  ],
};

function mockFetchForProvider(provider: string): void {
  const responseMap: Record<string, unknown> = {
    [ConnectorProvider.OPENAI]: mockOpenAIModelsResponse,
    [ConnectorProvider.ANTHROPIC]: mockAnthropicModelsResponse,
    [ConnectorProvider.GEMINI]: mockOpenAIModelsResponse,
    [ConnectorProvider.DEEPSEEK]: mockOpenAIModelsResponse,
    [ConnectorProvider.GROK]: mockGrokModelsResponse,
  };
  const body = responseMap[provider] ?? mockOpenAIModelsResponse;
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

const mockConnector = {
  id: 'conn-1',
  name: 'Test OpenAI',
  provider: ConnectorProvider.OPENAI,
  status: ConnectorStatus.UNKNOWN,
  authType: ConnectorAuthType.API_KEY,
  encryptedConfig: 'encrypted-api-key',
  isEnabled: true,
  defaultModelId: null,
  baseUrl: null,
  region: null,
  workspaceId: null,
  accountId: null,
  isPayAsYouGo: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockConnectorsRepo = (): Partial<Record<keyof ConnectorsRepository, Mock>> => ({
  update: vi.fn().mockResolvedValue(mockConnector),
});

const mockModelsRepo = (): Partial<Record<keyof ConnectorModelsRepository, Mock>> => ({
  upsertMany: vi.fn().mockResolvedValue(3),
  replaceMany: vi.fn().mockResolvedValue({ upserted: 3, deleted: 0 }),
  findByConnectorId: vi.fn().mockResolvedValue([]),
});

const mockHealthEventsRepo = (): Partial<Record<keyof HealthEventsRepository, Mock>> => ({
  create: vi.fn().mockResolvedValue({ id: 'event-1' }),
});

const mockSyncRunsRepo = (): Partial<Record<keyof SyncRunsRepository, Mock>> => ({
  create: vi.fn().mockResolvedValue({ id: 'run-1' }),
  update: vi.fn().mockResolvedValue({ id: 'run-1' }),
});

describe('ConnectorsManager', () => {
  let manager: ConnectorsManager;
  let connectorsRepo: ReturnType<typeof mockConnectorsRepo>;
  let modelsRepo: ReturnType<typeof mockModelsRepo>;
  let healthEventsRepo: ReturnType<typeof mockHealthEventsRepo>;
  let syncRunsRepo: ReturnType<typeof mockSyncRunsRepo>;

  beforeEach(() => {
    connectorsRepo = mockConnectorsRepo();
    modelsRepo = mockModelsRepo();
    healthEventsRepo = mockHealthEventsRepo();
    syncRunsRepo = mockSyncRunsRepo();
    manager = new ConnectorsManager(
      connectorsRepo as unknown as ConnectorsRepository,
      modelsRepo as unknown as ConnectorModelsRepository,
      healthEventsRepo as unknown as HealthEventsRepository,
      syncRunsRepo as unknown as SyncRunsRepository,
    );
    mockFetchForProvider(ConnectorProvider.OPENAI);
  });

  describe('testConnector', () => {
    it('should perform health check and record event', async () => {
      const result = await manager.testConnector(mockConnector);

      expect(result.status).toBe(ConnectorStatus.HEALTHY);
      expect(typeof result.latencyMs).toBe('number');
      expect(healthEventsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'conn-1',
          status: ConnectorStatus.HEALTHY,
        }),
      );
      expect(connectorsRepo.update).toHaveBeenCalledWith('conn-1', {
        status: ConnectorStatus.HEALTHY,
      });
    });

    it('should update connector status after health check', async () => {
      await manager.testConnector(mockConnector);

      expect(connectorsRepo.update).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({ status: ConnectorStatus.HEALTHY }),
      );
    });
  });

  describe('syncModels', () => {
    it('should sync models and create sync run record', async () => {
      const result = await manager.syncModels(mockConnector);

      expect(result.modelsFound).toBe(3);
      expect(syncRunsRepo.create).toHaveBeenCalledWith({
        connectorId: 'conn-1',
        status: ModelSyncStatus.RUNNING,
      });
      expect(modelsRepo.findByConnectorId).toHaveBeenCalledWith('conn-1');
      expect(modelsRepo.replaceMany).toHaveBeenCalledWith(
        'conn-1',
        ConnectorProvider.OPENAI,
        expect.arrayContaining([expect.objectContaining({ modelKey: 'gpt-4o' })]),
      );
      expect(syncRunsRepo.update).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({
          status: ModelSyncStatus.COMPLETED,
          modelsFound: 3,
        }),
      );
    });

    it('should calculate modelsAdded correctly for new connector', async () => {
      modelsRepo.findByConnectorId?.mockResolvedValue([]);

      const result = await manager.syncModels(mockConnector);

      expect(result.modelsAdded).toBe(3);
      expect(result.modelsRemoved).toBe(0);
    });

    it('should use correct adapter based on provider', async () => {
      const anthropicConnector = {
        ...mockConnector,
        provider: ConnectorProvider.ANTHROPIC,
      };
      mockFetchForProvider(ConnectorProvider.ANTHROPIC);

      const result = await manager.syncModels(anthropicConnector);

      expect(result.modelsFound).toBe(3);
      expect(modelsRepo.replaceMany).toHaveBeenCalledWith(
        'conn-1',
        ConnectorProvider.ANTHROPIC,
        expect.arrayContaining([expect.objectContaining({ modelKey: 'claude-opus-4' })]),
      );
    });

    it('should sync Grok models using GROK adapter', async () => {
      const grokConnector = {
        ...mockConnector,
        provider: ConnectorProvider.GROK,
        name: 'Test Grok',
      };
      mockFetchForProvider(ConnectorProvider.GROK);

      const result = await manager.syncModels(grokConnector);

      expect(result.modelsFound).toBe(4);
      expect(modelsRepo.replaceMany).toHaveBeenCalledWith(
        'conn-1',
        ConnectorProvider.GROK,
        expect.arrayContaining([
          expect.objectContaining({ modelKey: 'grok-3' }),
          expect.objectContaining({ modelKey: 'grok-3-mini' }),
        ]),
      );
    });
  });

  describe('getDecryptedConfig', () => {
    it('should decrypt connector config', () => {
      const config = manager.getDecryptedConfig(mockConnector);

      expect(config.provider).toBe(ConnectorProvider.OPENAI);
      expect(config.apiKey).toBe('sk-test-key');
    });

    it('should return empty apiKey when no encrypted config', () => {
      const connectorNoConfig = { ...mockConnector, encryptedConfig: null };

      const config = manager.getDecryptedConfig(connectorNoConfig);

      expect(config.apiKey).toBe('');
    });

    it('should pass baseUrl and region when present', () => {
      const connectorWithUrl = {
        ...mockConnector,
        baseUrl: 'https://custom-api.example.com',
        region: 'eu-west-1',
      };

      const config = manager.getDecryptedConfig(connectorWithUrl);

      expect(config.baseUrl).toBe('https://custom-api.example.com');
      expect(config.region).toBe('eu-west-1');
    });

    it('should return undefined for baseUrl and region when null', () => {
      const config = manager.getDecryptedConfig(mockConnector);

      expect(config.baseUrl).toBeUndefined();
      expect(config.region).toBeUndefined();
    });

    it('should pass the account id through', () => {
      const config = manager.getDecryptedConfig({
        ...mockConnector,
        accountId: '0123456789abcdef0123456789abcdef',
      });

      expect(config.accountId).toBe('0123456789abcdef0123456789abcdef');
    });
  });

  describe('getExecutionConfig', () => {
    const accountId = '0123456789abcdef0123456789abcdef';

    it('leaves a bespoke provider untouched, so chat-service keeps its own default', () => {
      const config = manager.getExecutionConfig(mockConnector);

      expect(config.baseUrl).toBeUndefined();
    });

    it('fills a preset connector with the preset default base URL', () => {
      const config = manager.getExecutionConfig({
        ...mockConnector,
        provider: ConnectorProvider.GROQ,
      });

      expect(config.baseUrl).toBe('https://api.groq.com/openai/v1');
    });

    it('keeps an administrator-edited preset base URL', () => {
      const config = manager.getExecutionConfig({
        ...mockConnector,
        provider: ConnectorProvider.MOONSHOT,
        baseUrl: 'https://api.moonshot.cn/v1/',
      });

      expect(config.baseUrl).toBe('https://api.moonshot.cn/v1');
    });

    it('substitutes the Cloudflare account id into the base URL', () => {
      const config = manager.getExecutionConfig({
        ...mockConnector,
        provider: ConnectorProvider.CLOUDFLARE,
        accountId,
      });

      expect(config.baseUrl).toBe(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
      );
    });

    it('refuses a Cloudflare connector with no account id instead of leaking a template', () => {
      expect(() =>
        manager.getExecutionConfig({ ...mockConnector, provider: ConnectorProvider.CLOUDFLARE }),
      ).toThrow(BusinessException);
    });
  });

  describe('syncModels - modelsRemoved calculation', () => {
    it('should calculate modelsRemoved when existing models exceed synced models', async () => {
      modelsRepo.findByConnectorId?.mockResolvedValue([
        { modelKey: 'gpt-4o' },
        { modelKey: 'gpt-4o-mini' },
        { modelKey: 'gpt-3.5-turbo' },
        { modelKey: 'old-1' },
        { modelKey: 'old-2' },
        { modelKey: 'old-3' },
        { modelKey: 'old-4' },
        { modelKey: 'old-5' },
        { modelKey: 'old-6' },
        { modelKey: 'old-7' },
      ]);
      modelsRepo.replaceMany?.mockResolvedValueOnce({ upserted: 3, deleted: 7 });

      const result = await manager.syncModels(mockConnector);

      expect(result.modelsRemoved).toBe(7);
      expect(result.modelsAdded).toBe(0);
    });
  });
});
