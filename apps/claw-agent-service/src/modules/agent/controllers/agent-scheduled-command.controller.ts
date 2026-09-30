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
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ScheduledCommandService } from '../services/scheduled-command.service';
import { RemoteTriggerService } from '../services/remote-trigger.service';
import {
  type CreateScheduledCommandDto,
  createScheduledCommandSchema,
} from '../dto/create-scheduled-command.dto';
import {
  type UpdateScheduledCommandStatusDto,
  updateScheduledCommandStatusSchema,
} from '../dto/update-scheduled-command-status.dto';
import {
  type TriggerScheduledCommandDto,
  triggerScheduledCommandSchema,
} from '../dto/trigger-scheduled-command.dto';
import type { RemoteTriggerResult } from '../types/remote-trigger.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { ScheduledCommand } from '../../../generated/prisma';

@Controller('agent/scheduled-commands')
export class AgentScheduledCommandController {
  constructor(
    private readonly service: ScheduledCommandService,
    private readonly remoteTrigger: RemoteTriggerService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createScheduledCommandSchema))
    dto: CreateScheduledCommandDto,
  ): Promise<ScheduledCommand> {
    return this.service.create(user.id, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<ScheduledCommand[]> {
    return this.service.list(user.id);
  }

  /** F029: fire now, at most once per idempotency key. */
  @Post(':id/trigger')
  @HttpCode(HttpStatus.OK)
  async trigger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(triggerScheduledCommandSchema))
    dto: TriggerScheduledCommandDto,
  ): Promise<RemoteTriggerResult> {
    return this.remoteTrigger.trigger(user.id, id, dto.idempotencyKey);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateScheduledCommandStatusSchema))
    dto: UpdateScheduledCommandStatusDto,
  ): Promise<ScheduledCommand> {
    return this.service.setStatus(user.id, id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.service.delete(user.id, id);
  }
}
