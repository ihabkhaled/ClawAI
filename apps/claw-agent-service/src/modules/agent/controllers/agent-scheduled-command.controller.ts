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
import {
  type CreateScheduledCommandDto,
  createScheduledCommandSchema,
} from '../dto/create-scheduled-command.dto';
import {
  type UpdateScheduledCommandStatusDto,
  updateScheduledCommandStatusSchema,
} from '../dto/update-scheduled-command-status.dto';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { ScheduledCommand } from '../../../generated/prisma';

@Controller('agent/scheduled-commands')
export class AgentScheduledCommandController {
  constructor(private readonly service: ScheduledCommandService) {}

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
