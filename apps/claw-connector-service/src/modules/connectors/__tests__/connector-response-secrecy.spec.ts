import { type Mock, vi } from 'vitest';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { ConnectorsService } from '../services/connectors.service';
import { type ConnectorsRepository } from '../repositories/connectors.repository';
import { type ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { type ConnectorsManager } from '../managers/connectors.manager';
import { ConnectorAuthType, ConnectorProvider, ConnectorStatus } from '../../../generated/prisma';

const PLAINTEXT_KEY = 'sk-live-PLAINTEXT-9f8e7d6c5b4a';
const CIPHERTEXT = 'CIPHERTEXT-iv:tag:3b2a1c0d9e8f7a6b';
const HEADERS_CIPHERTEXT = 'HEADERS-CIPHERTEXT-aa11bb22cc33';
const GATEWAY_VALUE = 'gateway-secret-value-xyz';

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }) },
}));

vi.mock('../../../common/utilities', () => ({
  encrypt: vi.fn().mockReturnValue('CIPHERTEXT-iv:tag:3b2a1c0d9e8f7a6b'),
  decrypt: vi.fn().mockReturnValue('sk-live-PLAINTEXT-9f8e7d6c5b4a'),
  verifyAccessToken: vi.fn(),
}));

const storedRow = {
  id: 'conn-1',
  name: 'OpenAI',
  provider: ConnectorProvider.OPENAI,
  status: ConnectorStatus.UNKNOWN,
  authType: ConnectorAuthType.API_KEY,
  encryptedConfig: CIPHERTEXT,
  encryptedGatewayHeaders: HEADERS_CIPHERTEXT,
  isEnabled: true,
  defaultModelId: null,
  baseUrl: null,
  region: null,
  workspaceId: null,
  accountId: null,
  isPayAsYouGo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { models: 2 },
};

function expectNoSecret(response: unknown): void {
  const json = JSON.stringify(response);
  for (const secret of [PLAINTEXT_KEY, CIPHERTEXT, HEADERS_CIPHERTEXT, GATEWAY_VALUE]) {
    expect(json).not.toContain(secret);
  }
}

describe('connector CRUD responses never carry a key or its ciphertext', () => {
  let service: ConnectorsService;
  let repo: Record<'create' | 'findById' | 'findAll' | 'countAll' | 'update' | 'delete', Mock>;

  beforeEach(() => {
    repo = {
      create: vi.fn().mockResolvedValue(storedRow),
      findById: vi.fn().mockResolvedValue(storedRow),
      findAll: vi.fn().mockResolvedValue([storedRow]),
      countAll: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue(storedRow),
      delete: vi.fn().mockResolvedValue(storedRow),
    };
    service = new ConnectorsService(
      repo as unknown as ConnectorsRepository,
      {} as unknown as ConnectorModelsRepository,
      {} as unknown as ConnectorsManager,
      { publish: vi.fn().mockResolvedValue(undefined) } as unknown as RabbitMQService,
    );
  });

  it('create', async () => {
    const response = await service.createConnector({
      name: 'OpenAI',
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
      apiKey: PLAINTEXT_KEY,
      gatewayHeaders: { 'x-gateway': GATEWAY_VALUE },
    });
    expectNoSecret(response);
  });

  it('list', async () => {
    expectNoSecret(await service.getConnectors({ page: 1, limit: 20 }));
  });

  it('get', async () => {
    expectNoSecret(await service.getConnector('conn-1'));
  });

  it('update', async () => {
    const response = await service.updateConnector('conn-1', {
      apiKey: PLAINTEXT_KEY,
      gatewayHeaders: { 'x-gateway': GATEWAY_VALUE },
    });
    expectNoSecret(response);
  });

  it('delete', async () => {
    expectNoSecret(await service.deleteConnector('conn-1'));
  });
});
