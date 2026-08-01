import { Injectable } from '@nestjs/common';
import type { DeviceAuthorizationGrant, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class DeviceAuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.DeviceAuthorizationGrantCreateInput): Promise<DeviceAuthorizationGrant> {
    return this.prisma.deviceAuthorizationGrant.create({ data });
  }

  findByDeviceCodeHash(deviceCodeHash: string): Promise<DeviceAuthorizationGrant | null> {
    return this.prisma.deviceAuthorizationGrant.findUnique({ where: { deviceCodeHash } });
  }

  async approve(userCode: string, userId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.deviceAuthorizationGrant.updateMany({
      where: { userCode, status: 'PENDING', expiresAt: { gt: now } },
      data: { status: 'APPROVED', approvedByUserId: userId, approvedAt: now },
    });
    return result.count === 1;
  }

  async deny(userCode: string, now: Date): Promise<boolean> {
    const result = await this.prisma.deviceAuthorizationGrant.updateMany({
      where: { userCode, status: 'PENDING', expiresAt: { gt: now } },
      data: { status: 'DENIED', deniedAt: now },
    });
    return result.count === 1;
  }

  async recordPoll(id: string, now: Date): Promise<boolean> {
    const result = await this.prisma.deviceAuthorizationGrant.updateMany({
      where: { id, status: { in: ['PENDING', 'APPROVED'] } },
      data: { lastPolledAt: now },
    });
    return result.count === 1;
  }

  async slowDown(id: string, now: Date, seconds: number): Promise<number> {
    const grant = await this.prisma.deviceAuthorizationGrant.update({
      where: { id },
      data: {
        intervalSeconds: { increment: seconds },
        pollViolationCount: { increment: 1 },
        lastPolledAt: now,
      },
    });
    return grant.intervalSeconds;
  }

  async consume(id: string, now: Date): Promise<boolean> {
    const result = await this.prisma.deviceAuthorizationGrant.updateMany({
      where: {
        id,
        status: 'APPROVED',
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { status: 'CONSUMED', consumedAt: now },
    });
    return result.count === 1;
  }
}
