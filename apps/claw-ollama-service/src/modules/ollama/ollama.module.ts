import { Module } from "@nestjs/common";
import { OllamaController } from "./ollama.controller";
import { OllamaService } from "./ollama.service";
import { OllamaManager } from "./managers/ollama.manager";
import { LocalModelsRepository } from "./repositories/local-models.repository";
import { RoleAssignmentsRepository } from "./repositories/role-assignments.repository";
import { PullJobsRepository } from "./repositories/pull-jobs.repository";
import { RuntimeConfigsRepository } from "./repositories/runtime-configs.repository";

@Module({
  controllers: [OllamaController],
  providers: [
    OllamaService,
    OllamaManager,
    LocalModelsRepository,
    RoleAssignmentsRepository,
    PullJobsRepository,
    RuntimeConfigsRepository,
  ],
  exports: [OllamaService],
})
export class OllamaModule {}
