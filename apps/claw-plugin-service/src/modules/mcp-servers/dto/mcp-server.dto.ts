import { z } from 'zod';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { AUTH_HEADER_PATTERN, TOOL_NAME_PATTERN } from '../../catalog/constants/catalog.constants';
import { containsHostileText } from '../../catalog/utilities/contains-hostile-text.utility';
import { EGRESS_URL_MAX_LENGTH } from '../../egress/constants/egress.constants';
import {
  MCP_SERVER_NAME_MAX,
  SERVER_CREDENTIAL_VALUE_MAX,
  SERVER_TOOLS_PATCH_MAX,
} from '../constants/mcp.constants';

const serverName = z
  .string()
  .trim()
  .min(1)
  .max(MCP_SERVER_NAME_MAX)
  .refine((value) => !containsHostileText(value, false), 'must be one line of plain text');

/** Printable ASCII only: a header value can carry nothing that frames a second header. */
const credentialValue = z
  .string()
  .min(1)
  .max(SERVER_CREDENTIAL_VALUE_MAX)
  .regex(/^[!-~]+$/, 'must be printable characters without spaces');

const credentialInput = z.strictObject({
  headerName: z.string().regex(AUTH_HEADER_PATTERN).optional(),
  value: credentialValue,
});

export const registerServerBodySchema = z
  .strictObject({
    name: serverName,
    url: z.string().max(EGRESS_URL_MAX_LENGTH),
    authKind: z.enum([AuthKind.NONE, AuthKind.API_KEY, AuthKind.BEARER_TOKEN]),
    credential: credentialInput.optional(),
  })
  .refine((body) => (body.authKind === AuthKind.NONE) === (body.credential === undefined), {
    message: 'credential is required with API_KEY or BEARER_TOKEN, and not allowed with NONE',
    path: ['credential'],
  });

const toolPatch = z.strictObject({
  name: z.string().regex(TOOL_NAME_PATTERN),
  enabled: z.boolean().optional(),
  riskLevel: z.enum(RiskLevel).optional(),
  consent: z.boolean().optional(),
});

export const updateServerBodySchema = z
  .strictObject({
    name: serverName.optional(),
    enabled: z.boolean().optional(),
    tools: z.array(toolPatch).min(1).max(SERVER_TOOLS_PATCH_MAX).optional(),
  })
  .refine(
    (body) => body.name !== undefined || body.enabled !== undefined || body.tools !== undefined,
    { message: 'name, enabled or tools is required' },
  );

export const serverCredentialBodySchema = credentialInput;

export const approveChangesBodySchema = z.strictObject({
  toolsHash: z.string().regex(/^[0-9a-f]{64}$/),
});

export const serverIdSchema = z.string().uuid();

export type RegisterServerBody = z.infer<typeof registerServerBodySchema>;
export type UpdateServerBody = z.infer<typeof updateServerBodySchema>;
export type ServerCredentialBody = z.infer<typeof serverCredentialBodySchema>;
export type ApproveChangesBody = z.infer<typeof approveChangesBodySchema>;
export type ToolPatchBody = z.infer<typeof toolPatch>;
