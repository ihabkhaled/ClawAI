import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { type RuntimeConfig } from "../../generated/prisma";
import { Public } from "../../app/decorators/public.decorator";
import { ZodValidationPipe } from "../../app/pipes/zod-validation.pipe";
import { type PaginatedResult } from "../../common/types";
import { OllamaService } from "./ollama.service";
import { PullModelDto, pullModelSchema } from "./dto/pull-model.dto";
import { AssignRoleDto, assignRoleSchema } from "./dto/assign-role.dto";
import { GenerateDto, generateSchema } from "./dto/generate.dto";
import { ListModelsQueryDto, listModelsQuerySchema } from "./dto/list-models-query.dto";
import {
  type GenerateResponse,
  type LocalModel,
  type LocalModelRoleAssignment,
  type RuntimeHealth,
} from "./types/ollama.types";

@Controller("ollama")
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Get("models")
  async listModels(
    @Query(new ZodValidationPipe(listModelsQuerySchema)) query: ListModelsQueryDto,
  ): Promise<PaginatedResult<LocalModel>> {
    return this.ollamaService.getModels(query);
  }

  @Post("pull")
  async pullModel(
    @Body(new ZodValidationPipe(pullModelSchema)) dto: PullModelDto,
  ): Promise<LocalModel> {
    return this.ollamaService.pullModel(dto);
  }

  @Post("assign-role")
  async assignRole(
    @Body(new ZodValidationPipe(assignRoleSchema)) dto: AssignRoleDto,
  ): Promise<LocalModelRoleAssignment> {
    return this.ollamaService.assignRole(dto);
  }

  @Public()
  @Post("generate")
  async generate(
    @Body(new ZodValidationPipe(generateSchema)) dto: GenerateDto,
  ): Promise<GenerateResponse> {
    return this.ollamaService.generate(dto);
  }

  @Public()
  @Get("health")
  async healthCheck(
    @Query("runtime") runtime: string,
  ): Promise<RuntimeHealth> {
    return this.ollamaService.checkHealth(runtime || "OLLAMA");
  }

  @Get("runtimes")
  async getRuntimes(): Promise<RuntimeConfig[]> {
    return this.ollamaService.getRuntimes();
  }
}
