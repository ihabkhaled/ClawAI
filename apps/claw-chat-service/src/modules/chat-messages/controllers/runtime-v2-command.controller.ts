import { Body, Controller, Param, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/types';
import {
  type RuntimeCancelDto,
  runtimeCancelSchema,
  type RuntimeResultDto,
  runtimeResultSchema,
  type RuntimeRunCommandQueryDto,
  runtimeRunCommandQuerySchema,
  type RuntimeSteeringDto,
  runtimeSteeringSchema,
} from '../dto/runtime-v2.dto';
import { RuntimeV2CommandService } from '../services/runtime-v2-command.service';
import type { RuntimeV2MutationAck } from '../types/runtime-v2-store.types';

@Controller('chat-messages/runtime/runs/:runId')
export class RuntimeV2CommandController {
  constructor(private readonly commands: RuntimeV2CommandService) {}

  @Post('results')
  result(
    @Param('runId') runId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(runtimeRunCommandQuerySchema)) query: RuntimeRunCommandQueryDto,
    @Body(new ZodValidationPipe(runtimeResultSchema)) command: RuntimeResultDto,
  ): Promise<RuntimeV2MutationAck> {
    return this.commands.submitResult(user.id, query.threadId, runId, command);
  }

  @Post('steering')
  steering(
    @Param('runId') runId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(runtimeRunCommandQuerySchema)) query: RuntimeRunCommandQueryDto,
    @Body(new ZodValidationPipe(runtimeSteeringSchema)) command: RuntimeSteeringDto,
  ): Promise<RuntimeV2MutationAck> {
    return this.commands.submitSteering(user.id, query.threadId, runId, command);
  }

  @Post('cancel')
  cancel(
    @Param('runId') runId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(runtimeRunCommandQuerySchema)) query: RuntimeRunCommandQueryDto,
    @Body(new ZodValidationPipe(runtimeCancelSchema)) command: RuntimeCancelDto,
  ): Promise<RuntimeV2MutationAck> {
    return this.commands.cancel(user.id, query.threadId, runId, command);
  }
}
