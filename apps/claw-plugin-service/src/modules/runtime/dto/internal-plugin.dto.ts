import { z } from 'zod';

import { TOOL_NAME_PATTERN } from '../../catalog/constants/catalog.constants';
import { ID_FIELD_MAX, SURFACE_PATTERN } from '../constants/runtime.constants';
import { INTERNAL_RESOLVE_REFS_MAX } from '../constants/internal-plugin.constants';
import { EXACTLY_ONE_TARGET_ISSUE, hasExactlyOneTarget, invokeFieldsSchema } from './invoke.dto';

const ownerId = z.string().min(1).max(ID_FIELD_MAX);

/**
 * POST /internal/plugins/invoke. The same call as the user route, but the caller is chat-service
 * acting for a user, so the owner's id is in the body and the service token is the credential.
 */
export const internalInvokeBodySchema = invokeFieldsSchema
  .extend({ userId: ownerId })
  .refine(hasExactlyOneTarget, EXACTLY_ONE_TARGET_ISSUE);

export type InternalInvokeBody = z.infer<typeof internalInvokeBodySchema>;

/** POST /internal/plugins/resolve: the `@mention` chips of one message. */
export const internalResolveBodySchema = z.strictObject({
  userId: ownerId,
  surface: z.string().regex(SURFACE_PATTERN).default('chat'),
  refs: z
    .array(
      z.strictObject({
        installId: z.string().uuid(),
        toolName: z.string().regex(TOOL_NAME_PATTERN).optional(),
        label: z.string().max(200).optional(),
      }),
    )
    .max(INTERNAL_RESOLVE_REFS_MAX),
});

export type InternalResolveBody = z.infer<typeof internalResolveBodySchema>;
