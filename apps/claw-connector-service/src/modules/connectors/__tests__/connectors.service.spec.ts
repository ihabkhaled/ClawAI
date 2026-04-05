import { ConnectorsService } from '../services/connectors.service';
import { ConnectorsRepository } from '../repositories/connectors.repository';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { ConnectorsManager } from '../managers/connectors.manager';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { EntityNotFoundException } from '../../../common/errors';
import { ConnectorProvider, ConnectorAuthType, ConnectorStatus } from '../../../generated/prisma';

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      ENCRYPTION_KEY: 'a'.repeat(64),
    }),
  },
}));

jest.mock('../../../common/utilities', () => ({
  encrypt: jest.fn().mockReturnValue('encrypted-api-key'),
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

const mockConnectorWithModels = {
  ...mockConnector,
  _count: { models: 3 },
};

const mockConnectorsRepository = (): Record<keyof ConnectorsRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByProvider: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countAll: jest.fn(),
});

const mockConnectorModelsRepository = (): Partial<
  Record<keyof ConnectorModelsRepository, jest.Mock>
> => ({
  findByConnectorId: jest.fn(),
  deleteByConnectorId: jest.fn(),
  upsertMany: jest.fn(),
  countByConnectorId: jest.fn(),
});

const mockManager = (): Partial<Record<keyof ConnectorsManager, jest.Mock>> => ({
  testConnector: jest.fn(),
  syncModels: jest.fn(),
  getDecryptedConfig: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe('ConnectorsService', () => {
  let service: ConnectorsService;
  let connectorsRepo: ReturnType<typeof mockConnectorsRepository>;
  let modelsRepo: ReturnType<typeof mockConnectorModelsRepository>;
  let manager: ReturnType<typeof mockManager>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    connectorsRepo = mockConnectorsRepository();
    modelsRepo = mockConnectorModelsRepository();
    manager = mockManager();
    rabbitMQ = mockRabbitMQ();
    service = new ConnectorsService(
      connectorsRepo as unknown as ConnectorsRepository,
      modelsRepo as unknown as ConnectorModelsRepository,
      manager as unknown as ConnectorsManager,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe('createConnector', () => {
    it('should create connector with encrypted API key and publish event', async () => {
      connectorsRepo.create.mockResolvedValue(mockConnector);

      const result = await service.createConnector({
        name: 'Test OpenAI',
        provider: ConnectorProvider.OPENAI,
        authType: ConnectorAuthType.API_KEY,
        apiKey: 'sk-test-key',
      });

      expect(result.id).toBe('conn-1');
      expect(result._count.models).toBe(0);
      expect(connectorsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test OpenAI',
          provider: ConnectorProvider.OPENAI,
          encryptedConfig: 'encrypted-api-key',
        }),
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.CONNECTOR_CREATED,
        expect.objectContaining({ connectorId: 'conn-1' }),
      );
    });

    it('should create connector without API key', async () => {
      const connectorNoKey = { ...mockConnector, encryptedConfig: null };
      connectorsRepo.create.mockResolvedValue(connectorNoKey);

      const result = await service.createConnector({
        name: 'Test',
        provider: ConnectorProvider.OLLAMA,
        authType: ConnectorAuthType.NONE,
      });

      expect(result.id).toBe('conn-1');
      expect(connectorsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ encryptedConfig: undefined }),
      );
    });
  });

  describe('getConnector', () => {
    it('should return connector with masked secrets', async () => {
      connectorsRepo.findById.mockResolvedValue(mockConnector);

      const result = await service.getConnector('conn-1');

      expect(result.encryptedConfig).toBe('****');
      expect(result.id).toBe('conn-1');
    });

    it('should throw EntityNotFoundException when connector not found', async () => {
      connectorsRepo.findById.mockResolvedValue(null);

      await expect(service.getConnector('nonexistent')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getConnectors', () => {
    it('should return paginated connectors with masked secrets', async () => {
      connectorsRepo.findAll.mockResolvedValue([mockConnectorWithModels]);
      connectorsRepo.countAll.mockResolvedValue(1);

      const result = await service.getConnectors({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.encryptedConfig).toBe('****');
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('updateConnector', () => {
    it('should update connector and re-encrypt API key', async () => {
      const updated = { ...mockConnector, name: 'Updated Name' };
      connectorsRepo.findById.mockResolvedValue(mockConnector);
      connectorsRepo.update.mockResolvedValue(updated);

      const result = await service.updateConnector('conn-1', {
        name: 'Updated Name',
        apiKey: 'sk-new-key',
      });

      expect(result.encryptedConfig).toBe('****');
      expect(connectorsRepo.update).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({
          name: 'Updated Name',
          encryptedConfig: 'encrypted-api-key',
        }),
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.CONNECTOR_UPDATED,
        expect.objectContaining({ connectorId: 'conn-1' }),
      );
    });

    it('should throw EntityNotFoundException when connector not found', async () => {
      connectorsRepo.findById.mockResolvedValue(null);

      await expect(service.updateConnector('nonexistent', { name: 'Updated' })).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('deleteConnector', () => {
    it('should delete connector and publish event', async () => {
      connectorsRepo.findById.mockResolvedValue(mockConnector);
      connectorsRepo.delete.mockResolvedValue(mockConnector);

      const result = await service.deleteConnector('conn-1');

      expect(result.id).toBe('conn-1');
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.CONNECTOR_DELETED,
        expect.objectContaining({ connectorId: 'conn-1' }),
      );
    });
  });

  describe('testConnector', () => {
    it('should delegate to manager and publish health event', async () => {
      const healthResult = { status: ConnectorStatus.HEALTHY, latencyMs: 50 };
      connectorsRepo.findById.mockResolvedValue(mockConnector);
      manager.testConnector?.mockResolvedValue(healthResult);

      const result = await service.testConnector('conn-1');

      expect(result.status).toBe(ConnectorStatus.HEALTHY);
      expect(manager.testConnector).toHaveBeenCalledWith(mockConnector);
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.CONNECTOR_HEALTH_CHECKED,
        expect.objectContaining({
          connectorId: 'conn-1',
          status: ConnectorStatus.HEALTHY,
        }),
      );
    });
  });

  describe('syncModels', () => {
    it('should delegate to manager and publish sync event', async () => {
      const syncResult = { modelsFound: 3, modelsAdded: 3, modelsRemoved: 0 };
      connectorsRepo.findById.mockResolvedValue(mockConnector);
      manager.syncModels?.mockResolvedValue(syncResult);

      const result = await service.syncModels('conn-1');

      expect(result.modelsFound).toBe(3);
      expect(manager.syncModels).toHaveBeenCalledWith(mockConnector);
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.CONNECTOR_SYNCED,
        expect.objectContaining({
          connectorId: 'conn-1',
          modelsFound: 3,
        }),
      );
    });
  });

  describe('getModels', () => {
    it('should return models for a connector', async () => {
      const mockModels = [{ id: 'model-1', modelKey: 'gpt-5.4' }];
      connectorsRepo.findById.mockResolvedValue(mockConnector);
      modelsRepo.findByConnectorId?.mockResolvedValue(mockModels);

      const result = await service.getModels('conn-1');

      expect(result).toEqual(mockModels);
      expect(modelsRepo.findByConnectorId).toHaveBeenCalledWith('conn-1');
    });

    it('should throw EntityNotFoundException when connector not found', async () => {
      connectorsRepo.findById.mockResolvedValue(null);

      await expect(service.getModels('nonexistent')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('testConnector - error path', () => {
    it('should throw EntityNotFoundException when connector not found', async () => {
      connectorsRepo.findById.mockResolvedValue(null);

      await expect(service.testConnector('nonexistent')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('syncModels - error path', () => {
    it('should throw EntityNotFoundException when connector not found', async () => {
      connectorsRepo.findById.mockResolvedValue(null);

      await expect(service.syncModels('nonexistent')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('deleteConnector - error path', () => {
    it('should throw EntityNotFoundException when connector not found', async () => {
      connectorsRepo.findById.mockResolvedValue(null);

      await expect(service.deleteConnector('nonexistent')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getConnectors - edge cases', () => {
    it('should calculate totalPages correctly', async () => {
      connectorsRepo.findAll.mockResolvedValue([mockConnectorWithModels]);
      connectorsRepo.countAll.mockResolvedValue(45);

      const result = await service.getConnectors({ page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.total).toBe(45);
    });

    it('should pass filters to repository', async () => {
      connectorsRepo.findAll.mockResolvedValue([]);
      connectorsRepo.countAll.mockResolvedValue(0);

      await service.getConnectors({
        page: 2,
        limit: 10,
        provider: ConnectorProvider.ANTHROPIC,
        status: ConnectorStatus.HEALTHY,
        isEnabled: true,
        search: 'claude',
      });

      expect(connectorsRepo.findAll).toHaveBeenCalledWith(
        {
          provider: ConnectorProvider.ANTHROPIC,
          status: ConnectorStatus.HEALTHY,
          isEnabled: true,
          search: 'claude',
        },
        2,
        10,
      );
    });

    it('should mask secrets for connectors without encrypted config', async () => {
      const connectorNoSecret = {
        ...mockConnectorWithModels,
        encryptedConfig: null,
      };
      connectorsRepo.findAll.mockResolvedValue([connectorNoSecret]);
      connectorsRepo.countAll.mockResolvedValue(1);

      const result = await service.getConnectors({ page: 1, limit: 20 });

      expect(result.data[0]?.encryptedConfig).toBeNull();
    });
  });
});
