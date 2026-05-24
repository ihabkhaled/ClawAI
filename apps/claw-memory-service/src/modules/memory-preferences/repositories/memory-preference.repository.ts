import { Injectable } from '@nestjs/common';
import { type MemoryPreference, MemoryRetention } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { MemoryPreferencePatch } from '../types/memory-preference.types';

export type { MemoryPreferencePatch };

@Injectable()
export class MemoryPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<MemoryPreference | null> {
    return this.prisma.memoryPreference.findUnique({ where: { userId } });
  }

  async upsert(userId: string, patch: MemoryPreferencePatch): Promise<MemoryPreference> {
    return this.prisma.memoryPreference.upsert({
      where: { userId },
      create: {
        userId,
        pausedAll: patch.pausedAll ?? false,
        autoApproveThreshold: patch.autoApproveThreshold ?? 0.85,
        defaultRetention: patch.defaultRetention ?? MemoryRetention.PERMANENT,
        defaultExpiresInDays: patch.defaultExpiresInDays ?? null,
        redactByDefault: patch.redactByDefault ?? true,
      },
      update: {
        ...(patch.pausedAll !== undefined ? { pausedAll: patch.pausedAll } : {}),
        ...(patch.autoApproveThreshold !== undefined
          ? { autoApproveThreshold: patch.autoApproveThreshold }
          : {}),
        ...(patch.defaultRetention !== undefined
          ? { defaultRetention: patch.defaultRetention }
          : {}),
        ...(patch.defaultExpiresInDays !== undefined
          ? { defaultExpiresInDays: patch.defaultExpiresInDays }
          : {}),
        ...(patch.redactByDefault !== undefined ? { redactByDefault: patch.redactByDefault } : {}),
      },
    });
  }
}
