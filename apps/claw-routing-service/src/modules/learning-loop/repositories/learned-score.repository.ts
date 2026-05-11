import { Injectable, Logger } from '@nestjs/common';
import { type DomainTag } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type LearnedScoreCounterField,
  type LearnedScoreRecord,
} from '../types/learning-loop.types';
import { mapPrismaLearnedScoreRow } from '../utilities/learned-score-row.utility';

@Injectable()
export class LearnedScoreRepository {
  private readonly logger = new Logger(LearnedScoreRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByKey(
    profileKey: string,
    domain: DomainTag,
    taskFamily: string,
  ): Promise<LearnedScoreRecord | null> {
    const row = await this.prisma.routerLearnedScore.findUnique({
      where: { profileKey_domain_taskFamily: { profileKey, domain, taskFamily } },
    });
    return row === null ? null : mapPrismaLearnedScoreRow(row);
  }

  async listForProfile(profileKey: string): Promise<LearnedScoreRecord[]> {
    const rows = await this.prisma.routerLearnedScore.findMany({
      where: { profileKey },
      orderBy: { domain: 'asc' },
    });
    return rows.map(mapPrismaLearnedScoreRow);
  }

  async upsert(input: {
    profileKey: string;
    domain: DomainTag;
    taskFamily: string;
    successRate: number;
    counterField: LearnedScoreCounterField;
  }): Promise<LearnedScoreRecord> {
    this.logger.log(
      `upsert profileKey=${input.profileKey} domain=${input.domain} task=${input.taskFamily} field=${input.counterField}`,
    );
    const row = await this.prisma.routerLearnedScore.upsert({
      where: {
        profileKey_domain_taskFamily: {
          profileKey: input.profileKey,
          domain: input.domain,
          taskFamily: input.taskFamily,
        },
      },
      create: {
        profileKey: input.profileKey,
        domain: input.domain,
        taskFamily: input.taskFamily,
        successRate: input.successRate,
        [input.counterField]: 1,
        totalRoutes: 1,
        lastUpdatedAt: new Date(),
      },
      update: {
        successRate: input.successRate,
        [input.counterField]: { increment: 1 },
        totalRoutes: { increment: 1 },
        lastUpdatedAt: new Date(),
      },
    });
    return mapPrismaLearnedScoreRow(row);
  }
}
