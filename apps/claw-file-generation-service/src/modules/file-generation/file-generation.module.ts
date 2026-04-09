import { Module } from '@nestjs/common';
import { FileGenerationController } from './controllers/file-generation.controller';
import { InternalFileGenerationController } from './controllers/internal-file-generation.controller';
import { FileGenerationService } from './services/file-generation.service';
import { FileGenerationEventsService } from './services/file-generation-events.service';
import { FileExecutionManager } from './managers/file-execution.manager';
import { FileGenerationRepository } from './repositories/file-generation.repository';

@Module({
  controllers: [FileGenerationController, InternalFileGenerationController],
  providers: [
    FileGenerationService,
    FileGenerationEventsService,
    FileExecutionManager,
    FileGenerationRepository,
  ],
  exports: [FileGenerationService],
})
export class FileGenerationModule {}
