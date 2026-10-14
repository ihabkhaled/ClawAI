import { z } from 'zod';

import { TOOL_NAME_PATTERN } from '../../catalog/constants/catalog.constants';
import { CALL_ID_PATTERN, ID_FIELD_MAX, SURFACE_PATTERN } from '../constants/runtime.constants';

/**
 * The fields every invoke body carries. Exactly one of installId (a catalog plugin the user
 * installed) or serverId (one of the user's own MCP servers) names the target. On the user route
 * the user is never in the body (it is the JWT user); the internal route adds the owner's id.
 */
export const invokeFieldsSchema = z.strictObject({
  installId: z.string().uuid().optional(),
  serverId: z.string().uuid().optional(),
  toolName: z.string().regex(TOOL_NAME_PATTERN),
  args: z.record(z.string().max(64), z.unknown()).default({}),
  callId: z.string().regex(CALL_ID_PATTERN),
  surface: z.string().regex(SURFACE_PATTERN).default('chat'),
  conversationId: z.string().min(1).max(ID_FIELD_MAX).optional(),
  messageId: z.string().min(1).max(ID_FIELD_MAX).optional(),
  /** True when an untrusted tool result is already in the model context this turn. */
  tainted: z.boolean().default(false),
  /** True only when the user explicitly approved THIS call (same callId, same arguments). */
  userApproved: z.boolean().default(false),
  /** The consent request the user approved on the chat card; spent once, bound to this call id and these arguments. */
  consentRequestId: z.string().uuid().optional(),
});

type TargetFields = { installId?: string | undefined; serverId?: string | undefined };

/** Exactly one of installId or serverId: shared by the user route and the internal route. */
export function hasExactlyOneTarget(body: TargetFields): boolean {
  return (body.installId === undefined) !== (body.serverId === undefined);
}

export const EXACTLY_ONE_TARGET_ISSUE = {
  message: 'exactly one of installId or serverId is required',
  path: ['installId'],
};

export const invokeBodySchema = invokeFieldsSchema.refine(
  hasExactlyOneTarget,
  EXACTLY_ONE_TARGET_ISSUE,
);

export type InvokeBody = z.infer<typeof invokeBodySchema>;
