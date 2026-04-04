import { Module } from "@nestjs/common";
import { ContextPacksController } from "./controllers/context-packs.controller";
import { ContextPacksService } from "./services/context-packs.service";
import { ContextPacksRepository } from "./repositories/context-packs.repository";

@Module({
  controllers: [ContextPacksController],
  providers: [ContextPacksService, ContextPacksRepository],
  exports: [ContextPacksService],
})
export class ContextPacksModule {}
