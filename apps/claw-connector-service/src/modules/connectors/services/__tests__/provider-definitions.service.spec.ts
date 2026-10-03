import { type Mock, vi } from 'vitest';
import { BusinessException } from '../../../../common/errors';
import { ConnectorProvider, ProviderAdapterFamily } from '../../../../generated/prisma';
import { ProviderDefinitionsService } from '../provider-definitions.service';
import { type ProviderDefinitionsRepository } from '../../repositories/provider-definitions.repository';
import { type ProviderDefinitionRecord } from '../../types/provider-definition.types';

vi.mock('@claw/shared-rabbitmq', () => ({
  RabbitMQService: class {},
  StructuredLogger: class {
    logAction(): void {}
  },
}));

const builtInDefinition = {
  id: 'builtin-openai',
  key: ConnectorProvider.OPENAI,
  displayName: 'OpenAI',
  description: null,
  adapterFamily: ProviderAdapterFamily.CODE_MANAGED,
  defaultBaseUrl: null,
  modelsEndpoint: null,
  modelsResponseFormat: null,
  healthCheckEndpoint: null,
  authType: null,
  supportsNativeTools: false,
  supportsVision: false,
  registerUrl: null,
  apiKeyUrl: null,
  pricingUrl: null,
  docsUrl: null,
  defaultIsPayAsYouGo: true,
  hasFreeTier: false,
  isActive: true,
  isBuiltIn: true,
  connectorProvider: ConnectorProvider.OPENAI,
  everConnected: false,
  capabilityDefaults: {},
  createdBy: null,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  connectors: [],
  _count: { connectors: 0 },
} as unknown as ProviderDefinitionRecord;

const repositoryMock = (): Record<keyof ProviderDefinitionsRepository, Mock> => ({
  findPage: vi.fn(),
  count: vi.fn(),
  findById: vi.fn(),
  findByKey: vi.fn(),
  findByConnectorProvider: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('ProviderDefinitionsService built-in lifecycle', () => {
  let repository: ReturnType<typeof repositoryMock>;
  let service: ProviderDefinitionsService;

  beforeEach(() => {
    repository = repositoryMock();
    service = new ProviderDefinitionsService(
      repository as unknown as ProviderDefinitionsRepository,
      {} as never,
    );
    repository.findById.mockResolvedValue(builtInDefinition);
    repository.update.mockResolvedValue({ ...builtInDefinition, isActive: false });
  });

  it('allows a built-in provider to be deactivated', async () => {
    await service.setActive('builtin-openai', false, { id: 'admin-1' });

    expect(repository.update).toHaveBeenCalledWith('builtin-openai', {
      isActive: false,
      updatedBy: 'admin-1',
    });
  });

  it('blocks edits to built-in provider identity and configuration', async () => {
    await expect(
      service.update('builtin-openai', { displayName: 'Changed identity' }, { id: 'admin-1' }),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('never physically deletes a built-in provider', async () => {
    await expect(service.remove('builtin-openai', { id: 'admin-1' })).rejects.toBeInstanceOf(
      BusinessException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('does not let custom definitions select the code-managed adapter family', async () => {
    repository.findById.mockResolvedValue({
      ...builtInDefinition,
      isBuiltIn: false,
      adapterFamily: ProviderAdapterFamily.OPENAI_COMPATIBLE,
    });

    await expect(
      service.update(
        'builtin-openai',
        { adapterFamily: ProviderAdapterFamily.CODE_MANAGED },
        { id: 'admin-1' },
      ),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
