import { Module } from '@nestjs/common';

import { RuntimeSettingsManager } from './managers/runtime-settings.manager';
import { RuntimeSettingsRepository } from './repositories/runtime-settings.repository';

@Module({
  providers: [RuntimeSettingsManager, RuntimeSettingsRepository],
  exports: [RuntimeSettingsManager],
})
export class RuntimeSettingsModule {}
