export const ROLE_PACK_POLL_INTERVAL_MS = 2000;
export const MAX_ROLE_PACK_POLL_COUNT = 90;
export const ROLE_PACK_POLL_MESSAGES_LIMIT = 10;
export const ROLE_PACK_CONTENT_MIN_LENGTH = 10;

export const ROLE_PACK_OPTIONS = [
  { value: 'coding-team', labelKey: 'rolePack.packCoding' },
  { value: 'research-team', labelKey: 'rolePack.packResearch' },
  { value: 'marketing-team', labelKey: 'rolePack.packMarketing' },
  { value: 'legal-team', labelKey: 'rolePack.packLegal' },
] as const;

// Stable stage IDs for the OrchestrationStageTimeline rendered on the
// /chat/role-pack page. The role-pack flow has three logical stages:
//   1. submitting       — user clicked Run Team; awaiting POST response.
//   2. running-roles    — each role in the pack is executing in parallel.
//   3. synthesizing     — a final aggregator pass merges the role outputs.
// The hook maps SSE events from the chat-service back into these IDs so
// React can swap status in place without losing focus.
export const ROLE_PACK_STAGE_IDS = {
  Submitting: 'role-pack:submitting',
  RunningRoles: 'role-pack:running-roles',
  Synthesizing: 'role-pack:synthesizing',
} as const;

// i18n key for each stage label. The status pill is supplied by the
// shared OrchestrationStageTimeline itself; these keys cover only the
// row label rendered next to the dot.
export const ROLE_PACK_STAGE_LABEL_KEYS = {
  [ROLE_PACK_STAGE_IDS.Submitting]: 'rolePack.stages.submitting',
  [ROLE_PACK_STAGE_IDS.RunningRoles]: 'rolePack.stages.runningRoles',
  [ROLE_PACK_STAGE_IDS.Synthesizing]: 'rolePack.stages.synthesizing',
} as const;
