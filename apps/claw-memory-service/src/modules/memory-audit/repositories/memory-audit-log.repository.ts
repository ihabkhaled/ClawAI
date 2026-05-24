import { Injectable } from '@nestjs/common';
import { type MemoryAuditLog, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { WriteAuditLogData } from '../types/memory-audit.types';

@Injectable()
export class MemoryAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async write(data: WriteAuditLogData): Promise<MemoryAuditLog> {
    return this.prisma.memoryAuditLog.create({
      data: {
        userId: data.userId,
        memoryId: data.memoryId ?? null,
        action: data.action,
        actor: data.actor,
        details:
          data.details === undefined || data.details === null
            ? Prisma.JsonNull
            : (data.details as Prisma.InputJsonValue),
      },
    });
  }

  async findByMemoryId(memoryId: string, limit = 100): Promise<MemoryAuditLog[]> {
    return this.prisma.memoryAuditLog.findMany({
      where: { memoryId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByUserId(userId: string, limit = 100): Promise<MemoryAuditLog[]> {
    return this.prisma.memoryAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
