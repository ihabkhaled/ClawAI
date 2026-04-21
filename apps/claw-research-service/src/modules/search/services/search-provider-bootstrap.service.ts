import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { SearchProviderStatus } from '../../../common/enums/search-provider-status.enum';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import {
  DEFAULT_SEARCH_PROVIDER_BASE_URL,
  DEFAULT_SEARCH_PROVIDER_DESCRIPTION,
  DEFAULT_SEARCH_PROVIDER_NAME,
  DEFAULT_SEARCH_PROVIDER_PRIORITY,
  DEFAULT_SEARCH_PROVIDER_TIMEOUT_MS,
} from '../constants/default-search-provider.constants';
import { SearchProviderRepository } from '../repositories/search-provider.repository';

@Injectable()
export class SearchProviderBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SearchProviderBootstrapService.name);

  constructor(private readonly providers: SearchProviderRepository) {}

  async onModuleInit(): Promise<void> {
    const enabledProvider = await this.providers.findFirstEnabled();
    if (enabledProvider !== null) {
      return;
    }

    const defaultProvider = await this.providers.findByName(DEFAULT_SEARCH_PROVIDER_NAME);
    if (defaultProvider !== null) {
      if (
        defaultProvider.enabled &&
        defaultProvider.status === SearchProviderStatus.ACTIVE &&
        defaultProvider.baseUrl.length > 0
      ) {
        return;
      }

      await this.providers.update(defaultProvider.id, {
        enabled: true,
        status: SearchProviderStatus.ACTIVE,
        baseUrl:
          defaultProvider.baseUrl.length > 0
            ? defaultProvider.baseUrl
            : DEFAULT_SEARCH_PROVIDER_BASE_URL,
        timeoutMs:
          defaultProvider.timeoutMs > 0
            ? defaultProvider.timeoutMs
            : DEFAULT_SEARCH_PROVIDER_TIMEOUT_MS,
      });
      this.logger.log(`Re-enabled default search provider "${DEFAULT_SEARCH_PROVIDER_NAME}"`);
      return;
    }

    await this.providers.create({
      kind: SearchProviderKind.OLLAMA_WEB,
      name: DEFAULT_SEARCH_PROVIDER_NAME,
      description: DEFAULT_SEARCH_PROVIDER_DESCRIPTION,
      baseUrl: DEFAULT_SEARCH_PROVIDER_BASE_URL,
      enabled: true,
      priority: DEFAULT_SEARCH_PROVIDER_PRIORITY,
      status: SearchProviderStatus.ACTIVE,
      publicConfig: {},
      allowlistDomains: [],
      blocklistDomains: [],
      timeoutMs: DEFAULT_SEARCH_PROVIDER_TIMEOUT_MS,
      encryptedSecret: null,
      secretVersion: 0,
    });

    this.logger.log(`Bootstrapped search provider "${DEFAULT_SEARCH_PROVIDER_NAME}"`);
  }
}
