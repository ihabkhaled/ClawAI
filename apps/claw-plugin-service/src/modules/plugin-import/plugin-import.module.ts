import { Module } from '@nestjs/common';

import { EgressModule } from '../egress/egress.module';
import { InstallsModule } from '../installs/installs.module';
import { PluginImportController } from './controllers/plugin-import.controller';
import { GithubSourceManager } from './managers/github-source.manager';
import { PluginImportRepository } from './repositories/plugin-import.repository';
import { PluginImportService } from './services/plugin-import.service';

@Module({
  imports: [EgressModule, InstallsModule],
  controllers: [PluginImportController],
  providers: [PluginImportService, GithubSourceManager, PluginImportRepository],
  exports: [PluginImportRepository],
})
export class PluginImportModule {}
