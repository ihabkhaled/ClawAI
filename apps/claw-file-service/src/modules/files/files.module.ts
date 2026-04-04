import { Module } from "@nestjs/common";
import { FilesController } from "./controllers/files.controller";
import { FilesService } from "./services/files.service";
import { FilesRepository } from "./repositories/files.repository";

@Module({
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
  exports: [FilesService],
})
export class FilesModule {}
