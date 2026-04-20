import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PairingStatus } from '../../../common/enums/pairing-status.enum';
import type { PairingRequest, Prisma } from '../../../generated/prisma';

@Injectable()
export class PairingRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PairingRequestCreateInput): Promise<PairingRequest> {
    return this.prisma.pairingRequest.create({ data });
  }

  async findByCodeHash(codeHash: string): Promise<PairingRequest | null> {
    return this.prisma.pairingRequest.findUnique({ where: { codeHash } });
  }

  async approve(
    id: string,
    userId: string,
    deviceId: string,
    scopesCsv: string,
  ): Promise<PairingRequest | null> {
    const result = await this.prisma.pairingRequest.updateMany({
      where: { id, status: PairingStatus.PENDING },
      data: {
        status: PairingStatus.APPROVED,
        approvedByUserId: userId,
        approvedDeviceId: deviceId,
        approvedScopesCsv: scopesCsv,
      },
    });
    if (result.count === 0) return null;
    return this.prisma.pairingRequest.findUnique({ where: { id } });
  }

  async deny(id: string, userId: string): Promise<PairingRequest | null> {
    const result = await this.prisma.pairingRequest.updateMany({
      where: { id, status: PairingStatus.PENDING },
      data: {
        status: PairingStatus.DENIED,
        approvedByUserId: userId,
      },
    });
    if (result.count === 0) return null;
    return this.prisma.pairingRequest.findUnique({ where: { id } });
  }

  async markConsumed(id: string): Promise<void> {
    await this.prisma.pairingRequest.updateMany({
      where: { id, status: PairingStatus.APPROVED },
      data: { status: PairingStatus.CONSUMED, consumedAt: new Date() },
    });
  }

  async findExpiredPending(now: Date): Promise<Pick<PairingRequest, 'id'>[]> {
    return this.prisma.pairingRequest.findMany({
      where: { status: PairingStatus.PENDING, expiresAt: { lt: now } },
      select: { id: true },
    });
  }

  async markExpired(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.prisma.pairingRequest.updateMany({
      where: { id: { in: ids } },
      data: { status: PairingStatus.EXPIRED },
    });
    return result.count;
  }
}
