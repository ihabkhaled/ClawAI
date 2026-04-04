import { Module } from "@nestjs/common";
import { FilesController } from "./controllers/files.controller";
import { FilesService } from "./services/files.service";
import { FilesRepository } from "./repositories/files.repository";
import { FileChunksRepository } from "./repositories/file-chunks.repository";
import { FileProcessingManager } from "./managers/file-processing.manager";

@Module({
  controllers: [FilesController],
  providers: [FilesService, FilesRepository, FileChunksRepository, FileProcessingManager],
  exports: [FilesService, FilesRepository, FileChunksRepository],
})
export class FilesModule {}
