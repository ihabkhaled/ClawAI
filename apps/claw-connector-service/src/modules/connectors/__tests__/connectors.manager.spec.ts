import { ConnectorsManager } from '../managers/connectors.manager';
import { ConnectorsRepository } from '../repositories/connectors.repository';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { HealthEventsRepository } from '../repositories/health-events.repository';
import { SyncRunsRepository } from '../repositories/sync-runs.repository';
import {
  ConnectorProvider,
  ConnectorAuthType,
  ConnectorStatus,
  ModelSyncStatus,
} from '../../../generated/prisma';

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      ENCRYPTION_KEY: 'a'.repeat(64),
    }),
  },
}));

jest.mock('../../../common/utilities', () => ({
  encrypt: jest.fn().mockReturnValue('encrypted'),
  decrypt: jest.fn().mockReturnValue('sk-test-key'),
  verifyAccessToken: jest.fn(),
}));

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
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockConnectorsRepo = (): Partial<Record<keyof ConnectorsRepository, jest.Mock>> => ({
  update: jest.fn().mockResolvedValue(mockConnector),
});

const mockModelsRepo = (): Partial<Record<keyof ConnectorModelsRepository, jest.Mock>> => ({
  upsertMany: jest.fn().mockResolvedValue(3),
  countByConnectorId: jest.fn().mockResolvedValue(0),
});

const mockHealthEventsRepo = (): Partial<Record<keyof HealthEventsRepository, jest.Mock>> => ({
  create: jest.fn().mockResolvedValue({ id: 'event-1' }),
});

const mockSyncRunsRepo = (): Partial<Record<keyof SyncRunsRepository, jest.Mock>> => ({
  create: jest.fn().mockResolvedValue({ id: 'run-1' }),
  update: jest.fn().mockResolvedValue({ id: 'run-1' }),
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
      expect(modelsRepo.upsertMany).toHaveBeenCalledWith(
        'conn-1',
        ConnectorProvider.OPENAI,
        expect.arrayContaining([expect.objectContaining({ modelKey: 'gpt-5.4' })]),
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
      modelsRepo.countByConnectorId?.mockResolvedValue(0);

      const result = await manager.syncModels(mockConnector);

      expect(result.modelsAdded).toBe(3);
      expect(result.modelsRemoved).toBe(0);
    });

    it('should use correct adapter based on provider', async () => {
      const anthropicConnector = {
        ...mockConnector,
        provider: ConnectorProvider.ANTHROPIC,
      };

      const result = await manager.syncModels(anthropicConnector);

      expect(result.modelsFound).toBe(3);
      expect(modelsRepo.upsertMany).toHaveBeenCalledWith(
        'conn-1',
        ConnectorProvider.ANTHROPIC,
        expect.arrayContaining([expect.objectContaining({ modelKey: 'claude-opus-4' })]),
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
  });

  describe('syncModels - modelsRemoved calculation', () => {
    it('should calculate modelsRemoved when existing models exceed synced models', async () => {
      modelsRepo.countByConnectorId?.mockResolvedValue(10);

      const result = await manager.syncModels(mockConnector);

      expect(result.modelsRemoved).toBe(7);
      expect(result.modelsAdded).toBe(0);
    });
  });
});
