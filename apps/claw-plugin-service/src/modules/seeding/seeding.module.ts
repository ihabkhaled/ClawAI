import { Module } from '@nestjs/common';

import { CatalogSeedRepository } from './repositories/catalog-seed.repository';
import { PluginSettingsRepository } from './repositories/plugin-settings.repository';
import { CatalogSeederService } from './services/catalog-seeder.service';
import { PluginSettingsSeederService } from './services/plugin-settings-seeder.service';

@Module({
  providers: [
    CatalogSeedRepository,
    PluginSettingsRepository,
    CatalogSeederService,
    PluginSettingsSeederService,
  ],
})
export class SeedingModule {}
