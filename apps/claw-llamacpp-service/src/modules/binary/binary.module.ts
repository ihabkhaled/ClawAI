import { Module } from '@nestjs/common';
import { LlamacppEventsModule } from '../../common/events/llamacpp-events.module';
import { BinaryController } from './controllers/binary.controller';
import { BinaryInstallerManager } from './managers/binary-installer.manager';
import { BinaryReleaseRepository } from './repositories/binary-release.repository';
import { BinaryService } from './services/binary.service';

@Module({
  imports: [LlamacppEventsModule],
  controllers: [BinaryController],
  providers: [BinaryService, BinaryInstallerManager, BinaryReleaseRepository],
  exports: [BinaryService],
})
export class BinaryModule {}
