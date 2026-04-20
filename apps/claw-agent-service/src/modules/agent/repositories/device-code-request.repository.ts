import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { DeviceCodeStatus } from '../../../common/enums/device-code-status.enum';
import type { DeviceCodeRequest, Prisma } from '../../../generated/prisma';

@Injectable()
export class DeviceCodeRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DeviceCodeRequestCreateInput): Promise<DeviceCodeRequest> {
    return this.prisma.deviceCodeRequest.create({ data });
  }

  async findByHash(deviceCodeHash: string): Promise<DeviceCodeRequest | null> {
    return this.prisma.deviceCodeRequest.findUnique({ where: { deviceCodeHash } });
  }

  async findByUserCode(userCode: string): Promise<DeviceCodeRequest | null> {
    return this.prisma.deviceCodeRequest.findUnique({ where: { userCode } });
  }

  async incrementOffence(id: string, slowDownUntil: Date): Promise<DeviceCodeRequest> {
    return this.prisma.deviceCodeRequest.update({
      where: { id },
      data: {
        offenceCount: { increment: 1 },
        slowDownUntil,
      },
    });
  }

  async approve(
    id: string,
    userId: string,
    deviceId: string,
    scopesCsv: string,
  ): Promise<DeviceCodeRequest | null> {
    const result = await this.prisma.deviceCodeRequest.updateMany({
      where: { id, status: DeviceCodeStatus.PENDING },
      data: {
        status: DeviceCodeStatus.APPROVED,
        approvedByUserId: userId,
        approvedDeviceId: deviceId,
        approvedScopesCsv: scopesCsv,
      },
    });
    if (result.count === 0) return null;
    return this.prisma.deviceCodeRequest.findUnique({ where: { id } });
  }

  async deny(id: string, userId: string): Promise<DeviceCodeRequest | null> {
    const result = await this.prisma.deviceCodeRequest.updateMany({
      where: { id, status: DeviceCodeStatus.PENDING },
      data: { status: DeviceCodeStatus.DENIED, approvedByUserId: userId },
    });
    if (result.count === 0) return null;
    return this.prisma.deviceCodeRequest.findUnique({ where: { id } });
  }

  async markConsumed(id: string): Promise<void> {
    await this.prisma.deviceCodeRequest.updateMany({
      where: { id, status: DeviceCodeStatus.APPROVED },
      data: { status: DeviceCodeStatus.CONSUMED, consumedAt: new Date() },
    });
  }

  async findExpiredPending(now: Date): Promise<Pick<DeviceCodeRequest, 'id'>[]> {
    return this.prisma.deviceCodeRequest.findMany({
      where: { status: DeviceCodeStatus.PENDING, expiresAt: { lt: now } },
      select: { id: true },
    });
  }

  async markExpired(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.prisma.deviceCodeRequest.updateMany({
      where: { id: { in: ids } },
      data: { status: DeviceCodeStatus.EXPIRED },
    });
    return result.count;
  }
}
