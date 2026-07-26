import { type ChatShareSafetyStatus, type ChatShareVisibility } from '../../../generated/prisma';

/** Identity every chat-share event carries. */
export type ChatShareEventIdentity = {
  shareId: string;
  threadId: string;
  userId: string;
};

/** State a publish/refresh event reports. */
export type ChatShareSnapshotEventState = {
  visibility: ChatShareVisibility;
  safetyStatus: ChatShareSafetyStatus;
  messageCount: number;
  snapshotVersion: number;
  adsEligible: boolean;
};

/** A visibility transition, old → new. */
export type ChatShareVisibilityTransition = {
  previousVisibility: ChatShareVisibility;
  visibility: ChatShareVisibility;
};
