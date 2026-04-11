import {
  Body,
  Controller,
  Delete,
  Get,
  type MessageEvent,
  Param,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { type Observable } from 'rxjs';
import { type PullJob, type RuntimeConfig } from '../../generated/prisma';
import { Public } from '../../app/decorators/public.decorator';
import { SkipLogging } from '../../app/decorators/skip-logging.decorator';
import { ZodValidationPipe } from '../../app/pipes/zod-validation.pipe';
import { type PaginatedResult } from '../../common/types';
import { OllamaService } from './ollama.service';
import { type PullModelDto, pullModelSchema } from './dto/pull-model.dto';
import { type AssignRoleDto, assignRoleSchema } from './dto/assign-role.dto';
import { type GenerateDto, generateSchema } from './dto/generate.dto';
import { type ListModelsQueryDto, listModelsQuerySchema } from './dto/list-models-query.dto';
import { type ListCatalogQueryDto, listCatalogQuerySchema } from './dto/list-catalog-query.dto';
import {
  type GenerateResponse,
  type LocalModel,
  type LocalModelRoleAssignment,
  type RuntimeHealth,
} from './types/ollama.types';
import type { CatalogEntryWithInstallStatus } from './types/catalog.types';

@Controller('ollama')
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Get('models')
  async listModels(
    @Query(new ZodValidationPipe(listModelsQuerySchema)) query: ListModelsQueryDto,
  ): Promise<PaginatedResult<LocalModel>> {
    return this.ollamaService.getModels(query);
  }

  @Get('catalog')
  async listCatalog(
    @Query(new ZodValidationPipe(listCatalogQuerySchema)) query: ListCatalogQueryDto,
  ): Promise<PaginatedResult<CatalogEntryWithInstallStatus>> {
    return this.ollamaService.getCatalog(query);
  }

  @Get('catalog/:id')
  async getCatalogEntry(@Param('id') id: string): Promise<CatalogEntryWithInstallStatus> {
    return this.ollamaService.getCatalogEntry(id);
  }

  @Post('catalog/:id/pull')
  async pullFromCatalog(@Param('id') id: string): Promise<{ pullJobId: string }> {
    return this.ollamaService.pullFromCatalog(id);
  }

  @Get('pull-jobs')
  async getPullJobs(): Promise<PullJob[]> {
    return this.ollamaService.getPullJobs();
  }

  @Sse('pull-jobs/:id/progress')
  @SkipLogging()
  @SkipThrottle()
  getPullJobProgress(@Param('id') id: string): Observable<MessageEvent> {
    return this.ollamaService.getPullJobProgress(id);
  }

  @Delete('models/:id')
  async deleteModel(@Param('id') id: string): Promise<void> {
    return this.ollamaService.deleteModel(id);
  }

  @Delete('pull-jobs/:id')
  async cancelPullJob(@Param('id') id: string): Promise<PullJob> {
    return this.ollamaService.cancelPullJob(id);
  }

  @Post('pull')
  async pullModel(
    @Body(new ZodValidationPipe(pullModelSchema)) dto: PullModelDto,
  ): Promise<LocalModel> {
    return this.ollamaService.pullModel(dto);
  }

  @Post('assign-role')
  async assignRole(
    @Body(new ZodValidationPipe(assignRoleSchema)) dto: AssignRoleDto,
  ): Promise<LocalModelRoleAssignment> {
    return this.ollamaService.assignRole(dto);
  }

  @Public()
  @Post('generate')
  async generate(
    @Body(new ZodValidationPipe(generateSchema)) dto: GenerateDto,
  ): Promise<GenerateResponse> {
    return this.ollamaService.generate(dto);
  }

  @Public()
  @Get('health')
  async healthCheck(@Query('runtime') runtime: string): Promise<RuntimeHealth> {
    return this.ollamaService.checkHealth(runtime || 'OLLAMA');
  }

  @Get('runtimes')
  async getRuntimes(): Promise<RuntimeConfig[]> {
    return this.ollamaService.getRuntimes();
  }
}
