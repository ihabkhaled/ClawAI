import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { DeviceStatus } from '../../../common/enums/device-status.enum';
import { ScheduledCommandStatus } from '../../../common/enums/scheduled-command-status.enum';
import { DeviceRepository } from '../repositories/device.repository';
import { ScheduledCommandRepository } from '../repositories/scheduled-command.repository';
import type { CreateScheduledCommandDto } from '../dto/create-scheduled-command.dto';
import type { ScheduledCommand } from '../../../generated/prisma';

@Injectable()
export class ScheduledCommandService {
  constructor(
    private readonly repo: ScheduledCommandRepository,
    private readonly deviceRepo: DeviceRepository,
  ) {}

  async create(userId: string, dto: CreateScheduledCommandDto): Promise<ScheduledCommand> {
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
    const now = new Date();
    const nextRunAt = new Date(now.getTime() + dto.intervalMinutes * 60 * 1000);
    return this.repo.create({
      userId,
      device: { connect: { id: dto.deviceId } },
      name: dto.name,
      command: dto.command,
      workingDir: dto.workingDir,
      intervalMinutes: dto.intervalMinutes,
      nextRunAt,
    });
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
