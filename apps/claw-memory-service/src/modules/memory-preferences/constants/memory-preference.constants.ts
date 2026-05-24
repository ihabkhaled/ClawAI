import { MemoryRetention } from '../../../generated/prisma';
import type { MemoryPreferenceDefaults } from '../types/memory-preference.types';

export const DEFAULT_MEMORY_PREFERENCE: MemoryPreferenceDefaults = {
  pausedAll: false,
  autoApproveThreshold: 0.85,
  defaultRetention: MemoryRetention.PERMANENT,
  defaultExpiresInDays: null,
  redactByDefault: true,
};
