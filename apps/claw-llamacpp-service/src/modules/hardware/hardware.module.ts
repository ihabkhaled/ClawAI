import { Module } from '@nestjs/common';
import { LlamacppEventsModule } from '../../common/events/llamacpp-events.module';
import { HardwareController } from './controllers/hardware.controller';
import { HardwareDetectorManager } from './managers/hardware-detector.manager';
import { PreflightValidatorManager } from './managers/preflight-validator.manager';
import { HardwareSnapshotRepository } from './repositories/hardware-snapshot.repository';
import { HardwareService } from './services/hardware.service';

@Module({
  imports: [LlamacppEventsModule],
  controllers: [HardwareController],
  providers: [
    HardwareService,
    HardwareDetectorManager,
    PreflightValidatorManager,
    HardwareSnapshotRepository,
  ],
  exports: [HardwareService, PreflightValidatorManager, HardwareDetectorManager],
})
export class HardwareModule {}
