import { Injectable } from '@nestjs/common';

import { CapabilityClass } from '../../../common/enums/capability-class.enum';
import { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { CapabilityInvocation, Prisma } from '../../../generated/prisma';
import type { ListCapabilitiesQueryDto } from '../dto/list-capabilities-query.dto';
import type { PaginatedCapabilities } from '../types/capability.types';

/**
 * Pure data access for `CapabilityInvocation`. No throw, no business
 * logic — all decisions live in the service / manager layer.
 */
@Injectable()
export class CapabilityInvocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CapabilityInvocationCreateInput): Promise<CapabilityInvocation> {
    return this.prisma.capabilityInvocation.create({ data });
  }

  async findById(id: string): Promise<CapabilityInvocation | null> {
    return this.prisma.capabilityInvocation.findUnique({ where: { id } });
  }

  async findByIdForUser(id: string, userId: string): Promise<CapabilityInvocation | null> {
    return this.prisma.capabilityInvocation.findFirst({ where: { id, userId } });
  }

  async findActiveForDevice(deviceId: string, take = 25): Promise<CapabilityInvocation[]> {
    return this.prisma.capabilityInvocation.findMany({
      where: {
        deviceId,
        status: { in: [CapabilityInvocationStatus.AUTO_APPROVED, CapabilityInvocationStatus.APPROVED] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  async list(query: ListCapabilitiesQueryDto, userId: string): Promise<PaginatedCapabilities> {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.CapabilityInvocationWhereInput = {
      userId,
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.capabilityClass !== undefined ? { capabilityClass: query.capabilityClass } : {}),
      ...(query.recipeRunId !== undefined ? { recipeRunId: query.recipeRunId } : {}),
      ...(query.deviceId !== undefined ? { deviceId: query.deviceId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.capabilityInvocation.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.capabilityInvocation.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async update(
    id: string,
    data: Prisma.CapabilityInvocationUpdateInput,
  ): Promise<CapabilityInvocation> {
    return this.prisma.capabilityInvocation.update({ where: { id }, data });
  }

  async tryStartExecution(id: string, deviceId: string): Promise<CapabilityInvocation | null> {
    const result = await this.prisma.capabilityInvocation.updateMany({
      where: {
        id,
        deviceId,
        status: { in: [CapabilityInvocationStatus.APPROVED, CapabilityInvocationStatus.AUTO_APPROVED] },
      },
      data: {
        status: CapabilityInvocationStatus.EXECUTING,
        startedExecutingAt: new Date(),
      },
    });
    if (result.count === 0) {
      return null;
    }
    return this.prisma.capabilityInvocation.findUnique({ where: { id } });
  }

  async expireStale(before: Date): Promise<number> {
    const result = await this.prisma.capabilityInvocation.updateMany({
      where: {
        status: CapabilityInvocationStatus.PENDING_APPROVAL,
        expiresAt: { lt: before },
      },
      data: { status: CapabilityInvocationStatus.EXPIRED },
    });
    return result.count;
  }

  async resetStuckExecuting(before: Date): Promise<number> {
    const result = await this.prisma.capabilityInvocation.updateMany({
      where: {
        status: CapabilityInvocationStatus.EXECUTING,
        startedExecutingAt: { lt: before },
      },
      data: {
        status: CapabilityInvocationStatus.FAILED,
        executionError: 'Capability timed out during execution',
      },
    });
    return result.count;
  }

  async countForUserClass(userId: string, capabilityClass: CapabilityClass): Promise<number> {
    return this.prisma.capabilityInvocation.count({
      where: { userId, capabilityClass },
    });
  }

  async deviceAgeDays(deviceId: string): Promise<number | null> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (device === null) {
      return null;
    }
    const ms = Date.now() - device.createdAt.getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  }
}
