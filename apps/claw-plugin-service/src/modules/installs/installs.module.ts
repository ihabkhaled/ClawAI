import { Module } from '@nestjs/common';

import { PluginInstallsController } from './controllers/plugin-installs.controller';
import { CredentialCryptoManager } from './managers/credential-crypto.manager';
import { InstallPlanGateManager } from './managers/install-plan-gate.manager';
import { InstallPresenterManager } from './managers/install-presenter.manager';
import { InstallSettingsManager } from './managers/install-settings.manager';
import { InstallSecretsRepository } from './repositories/install-secrets.repository';
import { InstallsRepository } from './repositories/installs.repository';
import { PluginConsentsService } from './services/plugin-consents.service';
import { PluginCredentialsService } from './services/plugin-credentials.service';
import { PluginInstallsService } from './services/plugin-installs.service';

@Module({
  controllers: [PluginInstallsController],
  providers: [
    PluginInstallsService,
    PluginCredentialsService,
    PluginConsentsService,
    InstallPlanGateManager,
    InstallPresenterManager,
    InstallSettingsManager,
    CredentialCryptoManager,
    InstallsRepository,
    InstallSecretsRepository,
  ],
  exports: [CredentialCryptoManager],
})
export class InstallsModule {}
