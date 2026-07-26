/** Entity type every chat-share audit row is filed under. */
export const CHAT_SHARE_AUDIT_ENTITY_TYPE = 'chat_share';

/** Audit action names for the six chat-share lifecycle events. */
export const CHAT_SHARE_AUDIT_ACTIONS = {
  PUBLISHED: 'CHAT_SHARE_PUBLISHED',
  UPDATED: 'CHAT_SHARE_UPDATED',
  VISIBILITY_CHANGED: 'CHAT_SHARE_VISIBILITY_CHANGED',
  REVOKED: 'CHAT_SHARE_REVOKED',
  URL_REGENERATED: 'CHAT_SHARE_URL_REGENERATED',
  SAFETY_REJECTED: 'CHAT_SHARE_SAFETY_REJECTED',
} as const;
