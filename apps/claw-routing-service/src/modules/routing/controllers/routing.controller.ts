import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type PaginatedResult } from '../../../common/types';
import { RoutingService } from '../services/routing.service';
import { CreatePolicyDto, createPolicySchema } from '../dto/create-policy.dto';
import { UpdatePolicyDto, updatePolicySchema } from '../dto/update-policy.dto';
import { ListPoliciesQueryDto, listPoliciesQuerySchema } from '../dto/list-policies-query.dto';
import { EvaluateRouteDto, evaluateRouteSchema } from '../dto/evaluate-route.dto';
import { type ReplayRoutingDto, replayRoutingSchema } from '../dto/replay-routing.dto';
import { type CompareRunsDto, compareRunsSchema } from '../dto/compare-runs.dto';
import { ListReplayRunsDto, listReplayRunsSchema } from '../dto/list-replay-runs.dto';
import { ReviewCaseDto, reviewCaseSchema } from '../dto/review-case.dto';
import {
  type RoutingDecision,
  type RoutingDecisionResult,
  type RoutingPolicy,
} from '../types/routing.types';
import { type ReplayBatchResult } from '../types/replay.types';
import type {
  ExportBundle,
  PromotedTestFixture,
  ReplayCaseDetail,
  ReplayRunSummary,
  RunComparisonResult,
} from '../types/replay-run.types';
import type { RecoveryStats } from '../types/recovery.types';
import type { AdaptiveLearningInsights } from '../types/adaptive-learning.types';
import type {
  RouterModelProfileRecord,
  RouterTopicProfileRecord,
  RoutingEducationSnapshot,
} from '../types/routing-education.types';

@Controller('routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('policies')
  async createPolicy(
    @Body(new ZodValidationPipe(createPolicySchema)) dto: CreatePolicyDto,
  ): Promise<RoutingPolicy> {
    return this.routingService.createPolicy(dto);
  }

  @Get('policies')
  async getPolicies(
    @Query(new ZodValidationPipe(listPoliciesQuerySchema)) query: ListPoliciesQueryDto,
  ): Promise<PaginatedResult<RoutingPolicy>> {
    return this.routingService.getPolicies(query);
  }

  @Get('policies/:id')
  async getPolicy(@Param('id') id: string): Promise<RoutingPolicy> {
    return this.routingService.getPolicy(id);
  }

  @Patch('policies/:id')
  async updatePolicy(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePolicySchema)) dto: UpdatePolicyDto,
  ): Promise<RoutingPolicy> {
    return this.routingService.updatePolicy(id, dto);
  }

  @Delete('policies/:id')
  async deletePolicy(@Param('id') id: string): Promise<RoutingPolicy> {
    return this.routingService.deletePolicy(id);
  }

  @Post('evaluate')
  async evaluateRoute(
    @Body(new ZodValidationPipe(evaluateRouteSchema)) dto: EvaluateRouteDto,
  ): Promise<RoutingDecisionResult> {
    return this.routingService.evaluateRoute(dto);
  }

  @Post('replay')
  async replay(
    @Body(new ZodValidationPipe(replayRoutingSchema)) dto: ReplayRoutingDto,
  ): Promise<ReplayBatchResult> {
    return this.routingService.replayRouting(dto);
  }

  @Get('replay/runs')
  async getReplayRuns(
    @Query(new ZodValidationPipe(listReplayRunsSchema)) query: ListReplayRunsDto,
  ): Promise<PaginatedResult<ReplayRunSummary>> {
    return this.routingService.getReplayRuns(query.page, query.limit);
  }

  @Get('replay/runs/:runId/cases')
  async getReplayRunCases(@Param('runId') runId: string): Promise<ReplayCaseDetail[]> {
    return this.routingService.getReplayRunCases(runId);
  }

  @Get('replay/runs/:runId/suspicious')
  async getSuspiciousCases(@Param('runId') runId: string): Promise<ReplayCaseDetail[]> {
    return this.routingService.getSuspiciousCases(runId);
  }

  @Post('replay/cases/:caseId/review')
  async reviewCase(
    @Param('caseId') caseId: string,
    @Body(new ZodValidationPipe(reviewCaseSchema)) dto: ReviewCaseDto,
  ): Promise<ReplayCaseDetail> {
    return this.routingService.reviewCase(caseId, dto.isConfirmedRegression, dto.reviewNotes);
  }

  @Get('replay/runs/:runId/export')
  async exportReplayRun(@Param('runId') runId: string): Promise<ExportBundle> {
    return this.routingService.exportReplayRun(runId);
  }

  @Post('replay/cases/:caseId/promote')
  async promoteCase(@Param('caseId') caseId: string): Promise<PromotedTestFixture> {
    return this.routingService.promoteCase(caseId);
  }

  @Get('replay/runs/compare')
  async compareRuns(
    @Query(new ZodValidationPipe(compareRunsSchema)) query: CompareRunsDto,
  ): Promise<RunComparisonResult> {
    return this.routingService.compareRuns(query.runId1, query.runId2);
  }

  @Get('adaptive-insights')
  async getAdaptiveInsights(
    @Query('windowDays') windowDays?: string,
  ): Promise<AdaptiveLearningInsights> {
    const days =
      windowDays !== undefined
        ? Math.min(Math.max(Number.parseInt(windowDays, 10) || 30, 1), 90)
        : 30;
    return this.routingService.getAdaptiveInsights(days);
  }

  @Get('education/snapshot')
  async getRoutingEducationSnapshot(): Promise<RoutingEducationSnapshot | null> {
    return this.routingService.getRoutingEducationSnapshot();
  }

  @Get('education/model-profiles')
  async getModelProfiles(
    @Query('taskFamily') taskFamily?: string,
    @Query('limit') limitStr?: string,
  ): Promise<RouterModelProfileRecord[]> {
    const limit = limitStr !== undefined ? Math.min(Number.parseInt(limitStr, 10) || 25, 100) : 25;
    return this.routingService.getModelProfiles(taskFamily, limit);
  }

  @Get('education/topic-profiles')
  async getTopicProfiles(
    @Query('taskFamily') taskFamily?: string,
    @Query('limit') limitStr?: string,
  ): Promise<RouterTopicProfileRecord[]> {
    const limit = limitStr !== undefined ? Math.min(Number.parseInt(limitStr, 10) || 25, 100) : 25;
    return this.routingService.getTopicProfiles(taskFamily, limit);
  }

  @Get('recovery/stats')
  async getRecoveryStats(@Query('limit') limitStr?: string): Promise<RecoveryStats> {
    const limit = limitStr !== undefined ? Math.min(Number.parseInt(limitStr, 10) || 20, 100) : 20;
    return this.routingService.getRecoveryStats(limit);
  }

  @Get('decisions/:threadId')
  async getDecisions(
    @Param('threadId') threadId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<PaginatedResult<RoutingDecision>> {
    return this.routingService.getDecisions(
      threadId,
      Number.parseInt(page, 10) || 1,
      Number.parseInt(limit, 10) || 20,
    );
  }
}
