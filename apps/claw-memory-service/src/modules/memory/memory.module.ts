import { Module } from "@nestjs/common";
import { MemoryController } from "./controllers/memory.controller";
import { MemoryInternalController } from "./controllers/memory-internal.controller";
import { MemoryService } from "./services/memory.service";
import { MemoryRepository } from "./repositories/memory.repository";

@Module({
  controllers: [MemoryController, MemoryInternalController],
  providers: [MemoryService, MemoryRepository],
  exports: [MemoryService, MemoryRepository],
})
export class MemoryModule {}
