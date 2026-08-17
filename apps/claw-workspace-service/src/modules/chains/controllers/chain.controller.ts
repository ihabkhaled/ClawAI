import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreateChainDto,
  createChainSchema,
  type UpdateChainDto,
  updateChainSchema,
} from '../dto/chain.dto';
import { type DraftChainFromNlDto, draftChainFromNlSchema } from '../dto/chain-nl-draft.dto';
import { ChainExecutorManager } from '../managers/chain-executor.manager';
import { ChainNlDraftManager } from '../managers/chain-nl-draft.manager';
import { ChainRepository } from '../repositories/chain.repository';
import { ChainService } from '../services/chain.service';
import type { ChainDsl, ChainRunView } from '../types/chain.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { WorkspaceChain, WorkspaceChainRun } from '../../../generated/prisma';

@Controller('workspace/chains')
export class ChainController {
  constructor(
    private readonly service: ChainService,
    private readonly executor: ChainExecutorManager,
    private readonly repo: ChainRepository,
    private readonly nlDraft: ChainNlDraftManager,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@CurrentUser() user: AuthenticatedUser): Promise<WorkspaceChain[]> {
    return this.service.list(user.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkspaceChain> {
    return this.service.getOwn(user.id, id);
  }

  // Phase 09 — turns a short natural-language request into an unpersisted
  // draft ChainDsl the caller reviews before saving via POST / (above).
  // Never auto-saves and never runs anything.
  @Post('draft-from-nl')
  @HttpCode(HttpStatus.OK)
  async draftFromNl(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(draftChainFromNlSchema)) dto: DraftChainFromNlDto,
  ): Promise<{ dsl: ChainDsl }> {
    const dsl = await this.nlDraft.draft(user.id, dto.prompt);
    return { dsl };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createChainSchema)) dto: CreateChainDto,
  ): Promise<WorkspaceChain> {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateChainSchema)) dto: UpdateChainDto,
  ): Promise<WorkspaceChain> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.service.deleteById(user.id, id);
  }

  // Run the chain synchronously and return the full run view (every
  // step's status + output). A chain is ≤20 steps so synchronous is
  // acceptable for v1.
  @Post(':id/run')
  @HttpCode(HttpStatus.OK)
  async runChain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ChainRunView> {
    return this.executor.run(user.id, id);
  }

  // Resumes a FAILED run from its first non-SUCCEEDED step (see
  // ChainExecutorManager.resume for why this is safe: already-SUCCEEDED
  // steps are never re-executed, so a resume can never duplicate a write
  // action that already completed).
  @Post(':id/runs/:runId/resume')
  @HttpCode(HttpStatus.OK)
  async resumeRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('runId') runId: string,
  ): Promise<ChainRunView> {
    return this.executor.resume(user.id, id, runId);
  }

  @Get(':id/runs')
  @HttpCode(HttpStatus.OK)
  async listRuns(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ): Promise<WorkspaceChainRun[]> {
    await this.service.getOwn(user.id, id); // 404 if not theirs
    const parsed = Number(limit ?? '20');
    const safeLimit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 20;
    return this.repo.listRunsForChain(id, safeLimit);
  }
}
