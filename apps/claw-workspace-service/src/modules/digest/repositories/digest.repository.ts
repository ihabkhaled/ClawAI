import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { DigestScope, DigestSnapshot, Prisma, UserDigestPreference } from '../../../generated/prisma';

@Injectable()
export class DigestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findToday(userId: string, scope: DigestScope, date: Date): Promise<DigestSnapshot | null> {
    return this.prisma.digestSnapshot.findUnique({
      where: { userId_scope_snapshotDate: { userId, scope, snapshotDate: this.atMidnight(date) } },
    });
  }

  async listForUser(userId: string, scope: DigestScope, limit: number): Promise<DigestSnapshot[]> {
    return this.prisma.digestSnapshot.findMany({
      where: { userId, scope },
      orderBy: { snapshotDate: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }

  async upsert(input: {
    userId: string;
    scope: DigestScope;
    snapshotDate: Date;
    sections: Prisma.InputJsonValue;
    actionItemSuggestionIds: Prisma.InputJsonValue;
    modelUsed: string;
    durationMs: number;
    errorMessage: string | null;
  }): Promise<DigestSnapshot> {
    return this.prisma.digestSnapshot.upsert({
      where: {
        userId_scope_snapshotDate: {
          userId: input.userId,
          scope: input.scope,
          snapshotDate: this.atMidnight(input.snapshotDate),
        },
      },
      create: {
        userId: input.userId,
        scope: input.scope,
        snapshotDate: this.atMidnight(input.snapshotDate),
        sections: input.sections,
        actionItemSuggestionIds: input.actionItemSuggestionIds,
        modelUsed: input.modelUsed,
        durationMs: input.durationMs,
        errorMessage: input.errorMessage,
      },
      update: {
        sections: input.sections,
        actionItemSuggestionIds: input.actionItemSuggestionIds,
        modelUsed: input.modelUsed,
        durationMs: input.durationMs,
        errorMessage: input.errorMessage,
        generatedAt: new Date(),
      },
    });
  }

  async findPreferenceByUserId(userId: string): Promise<UserDigestPreference | null> {
    return this.prisma.userDigestPreference.findUnique({ where: { userId } });
  }

  async linkActionItemSuggestions(snapshotId: string, queueIds: string[]): Promise<void> {
    await this.prisma.digestSnapshot.update({
      where: { id: snapshotId },
      data: { actionItemSuggestionIds: queueIds as unknown as Prisma.InputJsonValue },
    });
  }

  async upsertPreference(
    userId: string,
    data: Prisma.UserDigestPreferenceUpdateInput,
  ): Promise<UserDigestPreference> {
    return this.prisma.userDigestPreference.upsert({
      where: { userId },
      create: {
        userId,
        dailyEnabled: typeof data.dailyEnabled === 'boolean' ? data.dailyEnabled : true,
        weeklyEnabled: typeof data.weeklyEnabled === 'boolean' ? data.weeklyEnabled : true,
        dailyHourLocal: typeof data.dailyHourLocal === 'number' ? data.dailyHourLocal : 8,
        weeklyDayOfWeek: typeof data.weeklyDayOfWeek === 'number' ? data.weeklyDayOfWeek : 5,
        weeklyHourLocal: typeof data.weeklyHourLocal === 'number' ? data.weeklyHourLocal : 8,
        timezone: typeof data.timezone === 'string' ? data.timezone : 'UTC',
        providers:
          (data.providers as Prisma.InputJsonValue | undefined) ??
          ([] as Prisma.InputJsonValue),
      },
      update: data,
    });
  }

  private atMidnight(date: Date): Date {
    const out = new Date(date);
    out.setUTCHours(0, 0, 0, 0);
    return out;
  }
}
