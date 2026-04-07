import { Module } from "@nestjs/common";
import { ContextPacksController } from "./controllers/context-packs.controller";
import { ContextPacksInternalController } from "./controllers/context-packs-internal.controller";
import { ContextPacksService } from "./services/context-packs.service";
import { ContextPacksRepository } from "./repositories/context-packs.repository";

@Module({
  controllers: [ContextPacksController, ContextPacksInternalController],
  providers: [ContextPacksService, ContextPacksRepository],
  exports: [ContextPacksService, ContextPacksRepository],
})
export class ContextPacksModule {}
