import type { DigestScope } from '../enums/digest-scope.enum';

import type { TranslateFunction } from './i18n.types';

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

export type UpsertDigestPreferenceRequest = {
  dailyEnabled?: boolean;
  weeklyEnabled?: boolean;
  dailyHourLocal?: number;
  weeklyDayOfWeek?: number;
  weeklyHourLocal?: number;
  timezone?: string;
  providers?: string[];
};

export type DigestSectionCardProps = {
  section: DigestSection;
  t: TranslateFunction;
};

export type DigestPreferenceFormProps = {
  preference: DigestPreferenceView;
  isSaving: boolean;
  onSave: (next: UpsertDigestPreferenceRequest) => void;
  t: TranslateFunction;
};

export type UseDigestPageResult = {
  today: DigestSnapshotPayload | null;
  history: DigestSnapshotPayload[];
  preference: DigestPreferenceView | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isTriggering: boolean;
  isSavingPref: boolean;
  trigger: (scope: DigestScope) => void;
  savePreference: (next: UpsertDigestPreferenceRequest) => void;
};
