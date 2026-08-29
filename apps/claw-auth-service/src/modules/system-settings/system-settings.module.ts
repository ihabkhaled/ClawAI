import { Module } from '@nestjs/common';

import { AdminSystemSettingController } from './controllers/admin-system-setting.controller';
import { SystemSettingRepository } from './repositories/system-setting.repository';
import { SystemSettingService } from './services/system-setting.service';

// Exported because the credit module's reservation gate reads the PAYG kill
// switch through it. The switch is checked ONCE, inside reserve — not at every
// call site that can reach a provider, because a switch with eleven call sites
// is a switch that will one day be half off.
@Module({
  controllers: [AdminSystemSettingController],
  providers: [SystemSettingService, SystemSettingRepository],
  exports: [SystemSettingService],
})
export class SystemSettingsModule {}
