import type { DigestScope } from '../../../generated/prisma';

export type DigestSection = {
  provider: string;
  summary: string;
  highlights: string[];
  actionItems: Array<{
    title: string;
    description: string;
    sourceObjectId?: string;
    suggestedActionKind?: string;
  }>;
};

export type DigestSnapshotPayload = {
  id: string;
  userId: string;
  scope: DigestScope;
  snapshotDate: string;
  sections: DigestSection[];
  actionItemSuggestionIds: string[];
  generatedAt: string;
  modelUsed: string;
  durationMs: number;
  errorMessage: string | null;
};

export type DigestPreferenceView = {
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  dailyHourLocal: number;
  weeklyDayOfWeek: number;
  weeklyHourLocal: number;
  timezone: string;
  providers: string[];
  lastDailyAt: string | null;
  lastWeeklyAt: string | null;
};

export type UpsertDigestPreferenceInput = {
  userId: string;
  dailyEnabled?: boolean;
  weeklyEnabled?: boolean;
  dailyHourLocal?: number;
  weeklyDayOfWeek?: number;
  weeklyHourLocal?: number;
  timezone?: string;
  providers?: string[];
};
