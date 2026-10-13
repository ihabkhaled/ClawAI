import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { PLUGIN_SETTING_DEFAULTS } from '../constants/plugin-setting-defaults.constants';
import { PluginSettingsRepository } from '../repositories/plugin-settings.repository';

@Injectable()
export class PluginSettingsSeederService implements OnModuleInit {
  private readonly logger = new Logger(PluginSettingsSeederService.name);

  constructor(private readonly settings: PluginSettingsRepository) {}

  async onModuleInit(): Promise<void> {
    try {
      const inserted = await this.seed();
      this.logger.log(`onModuleInit: ${inserted} default plugin setting(s) inserted`);
    } catch (error) {
      // A DB blip at boot must not take the service down; the entrypoint has
      // already retried the migration, and the next boot seeds again.
      this.logger.error(`onModuleInit: settings seeding failed - ${(error as Error).message}`);
    }
  }

  /** Idempotent: returns how many missing keys were inserted. */
  seed(): Promise<number> {
    return this.settings.insertMissing(PLUGIN_SETTING_DEFAULTS);
  }
}
