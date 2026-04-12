import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller';
import { FilesInternalController } from './controllers/files-internal.controller';
import { FilesService } from './services/files.service';
import { FilesRepository } from './repositories/files.repository';
import { FileChunksRepository } from './repositories/file-chunks.repository';
import { FileProcessingManager } from './managers/file-processing.manager';
import { FileSecurityManager } from './managers/file-security.manager';

@Module({
  controllers: [FilesController, FilesInternalController],
  providers: [
    FilesService,
    FilesRepository,
    FileChunksRepository,
    FileProcessingManager,
    FileSecurityManager,
  ],
  exports: [FilesService, FilesRepository, FileChunksRepository],
})
export class FilesModule {}
