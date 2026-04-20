import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { DeviceStatus } from '../../../common/enums/device-status.enum';
import type { Device, Prisma } from '../../../generated/prisma';
import type { ListDevicesQueryDto } from '../dto/list-devices-query.dto';

@Injectable()
export class DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DeviceCreateInput): Promise<Device> {
    return this.prisma.device.create({ data });
  }

  async findById(id: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { id } });
  }

  async findByIdForUser(id: string, userId: string): Promise<Device | null> {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (device?.userId !== userId) {
      return null;
    }
    return device;
  }

  async findByIdWithCounts(
    id: string,
  ): Promise<(Device & { _count: { sessions: number; refreshTokens: number } }) | null> {
    return this.prisma.device.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true, refreshTokens: true } } },
    });
  }

  async listByUser(
    userId: string,
    query: ListDevicesQueryDto,
  ): Promise<{ data: Device[]; total: number }> {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.DeviceWhereInput = {
      userId,
      ...(query.status !== undefined ? { status: query.status } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.device.count({ where }),
    ]);
    return { data, total };
  }

  async updateName(id: string, name: string): Promise<Device> {
    return this.prisma.device.update({ where: { id }, data: { name } });
  }

  async updateScopes(id: string, scopesCsv: string): Promise<Device> {
    return this.prisma.device.update({ where: { id }, data: { scopesCsv } });
  }

  async updateLastSeen(id: string, ip: string | null): Promise<void> {
    await this.prisma.device.update({
      where: { id },
      data: { lastSeenAt: new Date(), lastIp: ip },
    });
  }

  async markRevoked(id: string, reason: string | null): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        status: DeviceStatus.REVOKED,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }
}
