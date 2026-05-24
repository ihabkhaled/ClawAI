import type { MemoryRetention } from '../../../generated/prisma';

export type MemoryPreferencePatch = {
  pausedAll?: boolean;
  autoApproveThreshold?: number;
  defaultRetention?: MemoryRetention;
  defaultExpiresInDays?: number | null;
  redactByDefault?: boolean;
};

export type MemoryPreferenceDefaults = {
  pausedAll: boolean;
  autoApproveThreshold: number;
  defaultRetention: MemoryRetention;
  defaultExpiresInDays: number | null;
  redactByDefault: boolean;
};
