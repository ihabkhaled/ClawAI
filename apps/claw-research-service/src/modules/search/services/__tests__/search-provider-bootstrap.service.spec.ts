import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { SearchProviderStatus } from '../../../../common/enums/search-provider-status.enum';
import {
  DEFAULT_SEARCH_PROVIDER_BASE_URL,
  DEFAULT_SEARCH_PROVIDER_NAME,
} from '../../constants/default-search-provider.constants';
import { SearchProviderBootstrapService } from '../search-provider-bootstrap.service';
import type { SearchProviderRepository } from '../../repositories/search-provider.repository';

describe('SearchProviderBootstrapService', () => {
  let repository: {
    findFirstEnabled: jest.Mock;
    findByName: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  let service: SearchProviderBootstrapService;

  beforeEach(() => {
    repository = {
      findFirstEnabled: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };
    service = new SearchProviderBootstrapService(repository as unknown as SearchProviderRepository);
  });

  it('does not create default provider when one active provider already exists', async () => {
    repository.findFirstEnabled.mockResolvedValue({
      id: 'p1',
      name: 'Existing',
      enabled: true,
      status: SearchProviderStatus.ACTIVE,
    } as unknown);

    await service.onModuleInit();

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('re-enables existing default provider when inactive', async () => {
    repository.findFirstEnabled.mockResolvedValue(null);
    repository.findByName.mockResolvedValue({
      id: 'default-1',
      name: DEFAULT_SEARCH_PROVIDER_NAME,
      enabled: false,
      status: SearchProviderStatus.INVALID,
      baseUrl: DEFAULT_SEARCH_PROVIDER_BASE_URL,
      timeoutMs: 0,
    } as unknown);
    repository.update.mockResolvedValue({});

    await service.onModuleInit();

    expect(repository.update).toHaveBeenCalledWith(
      'default-1',
      expect.objectContaining({
        enabled: true,
        status: SearchProviderStatus.ACTIVE,
      }),
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates default Ollama Web provider when no enabled providers exist', async () => {
    repository.findFirstEnabled.mockResolvedValue(null);
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue({});

    await service.onModuleInit();

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: SearchProviderKind.OLLAMA_WEB,
        name: DEFAULT_SEARCH_PROVIDER_NAME,
        baseUrl: DEFAULT_SEARCH_PROVIDER_BASE_URL,
        status: SearchProviderStatus.ACTIVE,
      }),
    );
  });
});
