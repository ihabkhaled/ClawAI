import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { type Request } from 'express';
import { ChatMessagesService } from '../services/chat-messages.service';
import { extractBearer } from '../../../common/utilities';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type ConsensusMessageDto, consensusMessageSchema } from '../dto/consensus-message.dto';
import {
  type EscalationChainMessageDto,
  escalationChainMessageSchema,
} from '../dto/escalation-chain-message.dto';
import { type RepairMessageDto, repairMessageSchema } from '../dto/repair-message.dto';
import { type DecomposeTaskDto, decomposeTaskSchema } from '../dto/decompose-task.dto';
import { type BestOfNMessageDto, bestOfNMessageSchema } from '../dto/best-of-n-message.dto';
import {
  type CostEnsembleMessageDto,
  costEnsembleMessageSchema,
} from '../dto/cost-ensemble-message.dto';
import { type VerifyMessageDto, verifyMessageSchema } from '../dto/verify-message.dto';
import { type PipelineMessageDto, pipelineMessageSchema } from '../dto/pipeline-message.dto';
import { type RolePackMessageDto, rolePackMessageSchema } from '../dto/role-pack-message.dto';
import { CreateMessageDto, createMessageSchema } from '../dto/create-message.dto';
import { type ParallelMessageDto, parallelMessageSchema } from '../dto/parallel-message.dto';
import { ListMessagesQueryDto, listMessagesQuerySchema } from '../dto/list-messages-query.dto';
import { SetFeedbackDto, setFeedbackSchema } from '../dto/set-feedback.dto';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser, type PaginatedResult } from '../../../common/types';
import { type ConsensusResponse } from '../types/consensus.types';
import { type EscalationChainResponse } from '../types/escalation-chain.types';
import { type AnswerRepairResponse } from '../types/answer-repair.types';
import { type TaskDecompositionResponse } from '../types/task-decomposition.types';
import { type BestOfNResponse } from '../types/best-of-n.types';
import { type CostEnsembleResponse } from '../types/cost-ensemble.types';
import { type VerifyResponse } from '../types/verifier.types';
import { type ParallelResponse } from '../types/parallel.types';
import { type PipelineResponse } from '../types/pipeline.types';
import { type RolePackResponse } from '../types/role-pack.types';
import { type ChatMessage } from '../../../generated/prisma';

@Controller('chat-messages')
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Body(new ZodValidationPipe(createMessageSchema)) dto: CreateMessageDto,
  ): Promise<ChatMessage> {
    return this.chatMessagesService.createMessage(user.id, dto, extractBearer(req));
  }

  @Post('parallel')
  async createParallel(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Body(new ZodValidationPipe(parallelMessageSchema)) dto: ParallelMessageDto,
  ): Promise<ParallelResponse> {
    return this.chatMessagesService.createParallelMessage(user.id, dto, extractBearer(req));
  }

  @Post('consensus')
  async createConsensus(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(consensusMessageSchema)) dto: ConsensusMessageDto,
  ): Promise<ConsensusResponse> {
    return this.chatMessagesService.createConsensusMessage(user.id, dto);
  }

  @Post('escalation-chain')
  async createEscalationChain(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(escalationChainMessageSchema)) dto: EscalationChainMessageDto,
  ): Promise<EscalationChainResponse> {
    return this.chatMessagesService.createEscalationChainMessage(user.id, dto);
  }

  @Post('repair')
  async createRepair(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(repairMessageSchema)) dto: RepairMessageDto,
  ): Promise<AnswerRepairResponse> {
    return this.chatMessagesService.createRepairMessage(user.id, dto);
  }

  @Post('decompose')
  async decomposeTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(decomposeTaskSchema)) dto: DecomposeTaskDto,
  ): Promise<TaskDecompositionResponse> {
    return this.chatMessagesService.executeDecomposition(user.id, dto);
  }

  @Post('best-of-n')
  async bestOfN(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bestOfNMessageSchema)) dto: BestOfNMessageDto,
  ): Promise<BestOfNResponse> {
    return this.chatMessagesService.executeBestOfN(user.id, dto);
  }

  @Post('cost-ensemble')
  async costEnsemble(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(costEnsembleMessageSchema)) dto: CostEnsembleMessageDto,
  ): Promise<CostEnsembleResponse> {
    return this.chatMessagesService.executeCostEnsemble(user.id, dto);
  }

  @Post('verify')
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(verifyMessageSchema)) dto: VerifyMessageDto,
  ): Promise<VerifyResponse> {
    return this.chatMessagesService.executeVerify(user.id, dto);
  }

  @Post('role-pack')
  async executeRolePack(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(rolePackMessageSchema)) dto: RolePackMessageDto,
  ): Promise<RolePackResponse> {
    return this.chatMessagesService.executeRolePack(user.id, dto);
  }

  @Post('pipeline')
  async executePipeline(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(pipelineMessageSchema)) dto: PipelineMessageDto,
  ): Promise<PipelineResponse> {
    return this.chatMessagesService.executePipeline(user.id, dto);
  }

  @Get('thread/:threadId')
  async findByThread(
    @Param('threadId') threadId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listMessagesQuerySchema)) query: ListMessagesQueryDto,
  ): Promise<PaginatedResult<ChatMessage>> {
    return this.chatMessagesService.getMessages(threadId, user.id, query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatMessage> {
    return this.chatMessagesService.getMessage(id, user.id);
  }

  @Post(':id/regenerate')
  async regenerate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatMessage> {
    return this.chatMessagesService.regenerateMessage(id, user.id);
  }

  @Patch(':id/feedback')
  async setFeedback(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(setFeedbackSchema)) dto: SetFeedbackDto,
  ): Promise<ChatMessage> {
    return this.chatMessagesService.setFeedback(user.id, id, dto.feedback);
  }
}
