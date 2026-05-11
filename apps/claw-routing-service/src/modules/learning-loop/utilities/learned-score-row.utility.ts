import { type RouterLearnedScore } from '../../../generated/prisma';
import { type LearnedScoreRecord } from '../types/learning-loop.types';

export function mapPrismaLearnedScoreRow(row: RouterLearnedScore): LearnedScoreRecord {
  return {
    id: row.id,
    profileKey: row.profileKey,
    domain: row.domain,
    taskFamily: row.taskFamily,
    successRate: Number(row.successRate.toString()),
    feedbackPositive: row.feedbackPositive,
    feedbackNegative: row.feedbackNegative,
    judgeVerified: row.judgeVerified,
    judgeRevised: row.judgeRevised,
    judgeEscalated: row.judgeEscalated,
    fallbackTriggered: row.fallbackTriggered,
    totalRoutes: row.totalRoutes,
    lastUpdatedAt: row.lastUpdatedAt,
    createdAt: row.createdAt,
  };
}
