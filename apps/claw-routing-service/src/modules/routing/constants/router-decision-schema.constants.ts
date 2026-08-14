import { z } from 'zod';

/**
 * The only shape a router model may answer with.
 *
 * `strict()` matters as much as the field list: a model that invents extra keys
 * is a model that has drifted from the contract, and silently accepting the
 * drift is how an unreviewed field ends up load-bearing later.
 */
export const routerDecisionSchema = z
  .object({
    deploymentId: z.string().min(1).max(128),
    workflow: z.string().min(1).max(64),
    confidence: z.number().min(0).max(1),
    reasonCodes: z.array(z.string().min(1).max(64)).max(12).default([]),
  })
  .strict();

/** Largest raw answer worth parsing. Anything beyond this is not a decision. */
export const MAX_ROUTER_RAW_LENGTH = 8_192;

/** How much of a malformed answer is echoed back on the repair attempt. */
export const REPAIR_HINT_RAW_LIMIT = 400;

/**
 * Appended to the one repair attempt.
 *
 * It restates the contract and shows the model its own failure, because a bare
 * "try again" reliably produces the same malformed answer a second time.
 */
export const ROUTER_REPAIR_INSTRUCTION =
  'Your previous answer was rejected. Reply with ONE JSON object and nothing else — ' +
  'no prose, no markdown fence, no extra keys. Required shape: ' +
  '{"deploymentId":string,"workflow":string,"confidence":number between 0 and 1,"reasonCodes":string[]}.';

/** Reasons a syntactically valid answer is still refused. */
export const DECISION_REJECTION_NO_JSON = 'NO_JSON_OBJECT';
export const DECISION_REJECTION_UNPARSABLE = 'UNPARSABLE_JSON';
export const DECISION_REJECTION_SCHEMA = 'SCHEMA_MISMATCH';
export const DECISION_REJECTION_OVERSIZED = 'OVERSIZED_RESPONSE';
export const DECISION_REJECTION_INELIGIBLE = 'DEPLOYMENT_NOT_ELIGIBLE';
