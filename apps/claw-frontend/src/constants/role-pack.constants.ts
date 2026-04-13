export const ROLE_PACK_POLL_INTERVAL_MS = 2000;
export const MAX_ROLE_PACK_POLL_COUNT = 90;
export const ROLE_PACK_POLL_MESSAGES_LIMIT = 10;
export const ROLE_PACK_AUTO_NAVIGATE_DELAY_MS = 3000;
export const ROLE_PACK_CONTENT_MIN_LENGTH = 10;

export const ROLE_PACK_OPTIONS = [
  { value: 'coding-team', labelKey: 'rolePack.packCoding' },
  { value: 'research-team', labelKey: 'rolePack.packResearch' },
  { value: 'marketing-team', labelKey: 'rolePack.packMarketing' },
  { value: 'legal-team', labelKey: 'rolePack.packLegal' },
] as const;
