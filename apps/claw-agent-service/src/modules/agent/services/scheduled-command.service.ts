import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { DeviceStatus } from '../../../common/enums/device-status.enum';
import { ScheduledCommandStatus } from '../../../common/enums/scheduled-command-status.enum';
import { DeviceRepository } from '../repositories/device.repository';
import { ScheduledCommandRepository } from '../repositories/scheduled-command.repository';
import { CRON_ROUTINE_INTERVAL_PLACEHOLDER_MINUTES } from '../../../common/constants/cron.constants';
import {
  nextCronRun,
  validateCronForRoutine,
} from '../../../common/utilities/cron-expression.utility';
import { ScheduledCommandKind } from '../../../common/enums/scheduled-command-kind.enum';
import type {
  CreateCommandRoutineDto,
  CreatePromptRoutineDto,
  CreateScheduledCommandDto,
} from '../dto/create-scheduled-command.dto';
import type { PromptRoutineSchedule } from '../../../common/types/cron.types';
import type { ScheduledCommand } from '../../../generated/prisma';

@Injectable()
export class ScheduledCommandService {
  constructor(
    private readonly repo: ScheduledCommandRepository,
    private readonly deviceRepo: DeviceRepository,
  ) {}

  async create(userId: string, dto: CreateScheduledCommandDto): Promise<ScheduledCommand> {
    return dto.kind === ScheduledCommandKind.PROMPT
      ? this.createPrompt(userId, dto)
      : this.createCommand(userId, dto);
  }

  private async createCommand(
    userId: string,
    dto: CreateCommandRoutineDto,
  ): Promise<ScheduledCommand> {
    const device = await this.deviceRepo.findByIdForUser(dto.deviceId, userId);
    if (device === null) {
      throw new BusinessException(
        'agent.device.not_found',
        'device_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (device.status !== DeviceStatus.ACTIVE) {
      throw new BusinessException('agent.device.revoked', 'device_revoked', HttpStatus.CONFLICT);
    }
    return this.repo.create({
      userId,
      kind: ScheduledCommandKind.COMMAND,
      device: { connect: { id: dto.deviceId } },
      name: dto.name,
      command: dto.command,
      workingDir: dto.workingDir,
      intervalMinutes: dto.intervalMinutes,
      nextRunAt: this.firstRun(dto.intervalMinutes),
    });
  }

  /**
   * F099: no device. When due it goes to one of the caller's own online
   * runners carrying every label; the runner approves each tool call locally.
   */
  private async createPrompt(
    userId: string,
    dto: CreatePromptRoutineDto,
  ): Promise<ScheduledCommand> {
    return this.repo.create({
      userId,
      kind: ScheduledCommandKind.PROMPT,
      name: dto.name,
      command: dto.prompt,
      model: dto.model ?? null,
      repoRef: dto.repoRef ?? null,
      runnerLabels: [...new Set(dto.runnerLabels)],
      ...this.promptSchedule(dto),
    });
  }

  /** A cron routine stores its normalised expression; an interval routine leaves `cron` null. */
  private promptSchedule(dto: CreatePromptRoutineDto): PromptRoutineSchedule {
    if (dto.cron === undefined) {
      const minutes = dto.intervalMinutes ?? CRON_ROUTINE_INTERVAL_PLACEHOLDER_MINUTES;
      return { cron: null, intervalMinutes: minutes, nextRunAt: this.firstRun(minutes) };
    }
    const now = Date.now();
    const checked = validateCronForRoutine(dto.cron, now);
    const next = checked.valid ? nextCronRun(checked.fields, now) : undefined;
    if (!checked.valid || next === undefined) {
      throw new BusinessException(
        'agent.scheduled_command.cron_invalid',
        'scheduled_command_cron_invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      cron: checked.expression,
      intervalMinutes: CRON_ROUTINE_INTERVAL_PLACEHOLDER_MINUTES,
      nextRunAt: new Date(next),
    };
  }

  private firstRun(intervalMinutes: number): Date {
    return new Date(Date.now() + intervalMinutes * 60 * 1000);
  }

  async list(userId: string): Promise<ScheduledCommand[]> {
    return this.repo.listByUser(userId);
  }

  async setStatus(
    userId: string,
    id: string,
    status: ScheduledCommandStatus,
  ): Promise<ScheduledCommand> {
    const existing = await this.repo.findByIdForUser(id, userId);
    if (existing === null) {
      throw new BusinessException(
        'agent.scheduled_command.not_found',
        'scheduled_command_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.repo.setStatus(id, status);
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findByIdForUser(id, userId);
    if (existing === null) {
      throw new BusinessException(
        'agent.scheduled_command.not_found',
        'scheduled_command_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.repo.deleteById(id);
  }
}
