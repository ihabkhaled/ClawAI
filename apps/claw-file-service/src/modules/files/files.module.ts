import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller';
import { FilesInternalController } from './controllers/files-internal.controller';
import { FilesService } from './services/files.service';
import { FilesRepository } from './repositories/files.repository';
import { FileChunksRepository } from './repositories/file-chunks.repository';
import { FileProcessingManager } from './managers/file-processing.manager';
import { FileSecurityManager } from './managers/file-security.manager';
import { FileRetentionSweeperManager } from './managers/file-retention-sweeper.manager';
import { ZipExpansionManager } from './managers/zip-expansion.manager';
import { TranscriptionManager } from './managers/transcription.manager';
import { TranscriptionCapabilityClient } from './clients/transcription-capability.client';

@Module({
  controllers: [FilesController, FilesInternalController],
  providers: [
    FilesService,
    FilesRepository,
    FileChunksRepository,
    FileProcessingManager,
    FileSecurityManager,
    FileRetentionSweeperManager,
    ZipExpansionManager,
    // B6b - audio transcription. The manager subscribes to
    // file.transcribe_requested in onModuleInit, which is what asserts the
    // queue before FileProcessingManager can publish into it.
    TranscriptionManager,
    TranscriptionCapabilityClient,
  ],
  exports: [FilesService, FilesRepository, FileChunksRepository],
})
export class FilesModule {}
