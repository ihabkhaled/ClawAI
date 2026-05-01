import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type InitiateHandoffDto, initiateHandoffSchema } from '../dto/impl-handoff.dto';
import { ImplHandoffManager } from '../managers/impl-handoff.manager';
import { parseHandoffStatus } from '../utilities/handoff-status.utility';
import {
  assertHandoffOwner,
  assertImplPromptReadyForHandoff,
  extractBriefOrThrow,
} from '../utilities/queue-validation.utility';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { HandoffPayload } from '../types/impl-handoff.types';

@Controller('workspace/impl-handoffs')
export class ImplHandoffController {
  constructor(
    private readonly manager: ImplHandoffManager,
    private readonly prisma: PrismaService,
  ) {}

  @Post('queue/:queueId')
  @HttpCode(HttpStatus.CREATED)
  async initiate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('queueId') queueId: string,
    @Body(new ZodValidationPipe(initiateHandoffSchema)) dto: InitiateHandoffDto,
  ): Promise<HandoffPayload> {
    const queueEntry = await this.prisma.aiActionApprovalQueue.findUnique({ where: { id: queueId } });
    assertImplPromptReadyForHandoff(queueEntry, user.id);
    const brief = extractBriefOrThrow(queueEntry);
    return this.manager.handoff({
      sourceQueueId: queueId,
      userId: user.id,
      mode: dto.mode,
      brief,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') statusRaw: string | undefined,
    @Query('limit') limitRaw: string | undefined,
  ): Promise<HandoffPayload[]> {
    const status = parseHandoffStatus(statusRaw);
    const limit = limitRaw === undefined ? 25 : Math.max(1, Math.min(100, Number(limitRaw)));
    return this.manager.list(user.id, status, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<HandoffPayload | null> {
    const handoff = await this.manager.getById(id);
    if (handoff === null) return null;
    assertHandoffOwner(handoff.userId, user.id);
    return handoff;
  }
}
