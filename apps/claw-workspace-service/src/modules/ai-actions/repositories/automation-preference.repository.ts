import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, UserAutomationPreference } from '../../../generated/prisma';

@Injectable()
export class AutomationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string): Promise<UserAutomationPreference[]> {
    return this.prisma.userAutomationPreference.findMany({
      where: { userId },
      orderBy: { actionKind: 'asc' },
    });
  }

  async findOne(userId: string, actionKind: string): Promise<UserAutomationPreference | null> {
    return this.prisma.userAutomationPreference.findUnique({
      where: { userId_actionKind: { userId, actionKind } },
    });
  }

  async upsert(
    userId: string,
    actionKind: string,
    data: Prisma.UserAutomationPreferenceUpdateInput,
  ): Promise<UserAutomationPreference> {
    return this.prisma.userAutomationPreference.upsert({
      where: { userId_actionKind: { userId, actionKind } },
      create: {
        userId,
        actionKind,
        isEnabled: typeof data.isEnabled === 'boolean' ? data.isEnabled : true,
        autoApproveBelowRiskScore:
          typeof data.autoApproveBelowRiskScore === 'number'
            ? data.autoApproveBelowRiskScore
            : null,
        perDayBudget: typeof data.perDayBudget === 'number' ? data.perDayBudget : null,
        providers:
          (data.providers as Prisma.InputJsonValue | undefined) ?? ([] as Prisma.InputJsonValue),
      },
      update: data,
    });
  }
}
