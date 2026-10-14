import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { SETTINGS_SCHEMA_DEFAULT } from '../../catalog/constants/catalog.constants';

export const CURATED_FIRST_VERSION = '1.0.0';

/** The name of the stand-in tool a seeded draft carries until an admin previews the real tools. */
export const CURATED_PLACEHOLDER_TOOL = 'placeholder';

/** Schema given to a draft tool the admin declared without one; a published tool always takes the probed schema. */
export const CURATED_DEFAULT_INPUT_SCHEMA: Record<string, unknown> = {
  ...SETTINGS_SCHEMA_DEFAULT,
  additionalProperties: true,
};

export const PLAN_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const PLAN_SLUGS_MAX = 20;
export const ADMIN_NOTES_MAX = 1000;
export const PROBE_CREDENTIAL_MAX = 4096;

export const CURATED_LIST_MAX = 500;
export const SERVERS_QUEUE_MAX = 100;
export const SERVER_TOOLS_SHOWN_MAX = 64;
export const SERVER_TOOL_TEXT_MAX = 200;
export const SERVER_DECISION_REASON_MAX = 200;

export const AUDIT_PAGE_DEFAULT = 50;
export const AUDIT_PAGE_MAX = 100;

export const ADMIN_CACHE_CONTROL = 'private, no-store';
export const ADMIN_OUTBOUND_THROTTLE = { limit: 20, ttl: 60_000 } as const;

export const SERVER_DECIDED_LINK = '/plugins/servers';

/** Stable audit-log error code for a probe that did not get an answer; the reason stays in the log. */
export const PROBE_ERROR_URL_BLOCKED = 'URL_BLOCKED';

/** Lowest to highest: a queue row shows the highest risk among its tools. */
export const QUEUE_RISK_ORDER: readonly RiskLevel[] = [
  RiskLevel.READ,
  RiskLevel.WRITE,
  RiskLevel.DESTRUCTIVE,
];

/** States a rejection may start from: a pending request, a server held for review, or a revoked approval. */
export const REJECTABLE_FROM: readonly ServerState[] = [
  ServerState.PENDING_APPROVAL,
  ServerState.NEEDS_REVIEW,
  ServerState.APPROVED,
];
