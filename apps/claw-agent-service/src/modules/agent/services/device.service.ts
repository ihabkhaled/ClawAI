import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { devicePublic } from '../../../common/utilities/device.utility';
import { DeviceRepository } from '../repositories/device.repository';
import type { ListDevicesQueryDto } from '../dto/list-devices-query.dto';
import type { UpdateDeviceDto } from '../dto/update-device.dto';
import type { DevicePublic, DeviceWithCounts, PaginatedDevices } from '../types/agent.types';

@Injectable()
export class DeviceService {
  constructor(private readonly repo: DeviceRepository) {}

  async listForUser(userId: string, query: ListDevicesQueryDto): Promise<PaginatedDevices> {
    const { data, total } = await this.repo.listByUser(userId, query);
    return {
      data: data.map(devicePublic),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getForUser(userId: string, deviceId: string): Promise<DeviceWithCounts> {
    const device = await this.repo.findByIdWithCounts(deviceId);
    if (device?.userId !== userId) {
      throw new BusinessException(
        'agent.device.not_found',
        'device_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      ...devicePublic(device),
      _count: {
        sessions: device._count.sessions,
        refreshTokens: device._count.refreshTokens,
      },
    };
  }

  async updateForUser(
    userId: string,
    deviceId: string,
    dto: UpdateDeviceDto,
  ): Promise<DevicePublic> {
    const existing = await this.repo.findByIdForUser(deviceId, userId);
    if (existing === null) {
      throw new BusinessException(
        'agent.device.not_found',
        'device_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (dto.name !== undefined) {
      await this.repo.updateName(deviceId, dto.name);
    }
    if (dto.scopes !== undefined) {
      await this.repo.updateScopes(deviceId, dto.scopes.join(','));
    }
    const refreshed = await this.repo.findById(deviceId);
    if (refreshed === null) {
      throw new BusinessException(
        'agent.device.not_found',
        'device_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    return devicePublic(refreshed);
  }
}
