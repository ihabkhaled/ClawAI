import { z } from 'zod';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { HostRuleKind } from '../../../common/enums/host-rule-kind.enum';
import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';
import { McpTransport } from '../../../common/enums/mcp-transport.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import {
  AUTH_HEADER_PATTERN,
  KEY_PATTERN,
  MAX_SCOPES_PER_MANIFEST,
  MAX_TOOLS_PER_MANIFEST,
  MAX_URL_LENGTH,
  PUBLISHER_MAX,
  SCOPE_ID_PATTERN,
  SLUG_PATTERN,
  TOOL_DESCRIPTION_MAX,
  TOOL_NAME_PATTERN,
  TOOL_TITLE_MAX,
} from '../../catalog/constants/catalog.constants';
import { pluginTranslationsSchema } from '../../catalog/schemas/plugin-manifest.schema';
import { containsHostileText } from '../../catalog/utilities/contains-hostile-text.utility';
import { isValidRulePattern } from '../../host-rules/utilities/is-valid-rule-pattern.utility';
import {
  HOST_RULE_NOTE_MAX,
  HOST_RULE_PATTERN_MAX,
} from '../../host-rules/constants/host-rules.constants';
import {
  ADMIN_NOTES_MAX,
  AUDIT_PAGE_DEFAULT,
  AUDIT_PAGE_MAX,
  PLAN_SLUG_PATTERN,
  PLAN_SLUGS_MAX,
  PROBE_CREDENTIAL_MAX,
  SERVER_DECISION_REASON_MAX,
} from '../constants/curation.constants';

const oneLine = (max: number): z.ZodType<string, string> =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !containsHostileText(value, false), 'must be one line of plain text');

/** Light shape only: the strict rules (header allow-list, https, hostile text) are the manifest schema's. */
const authSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal(AuthKind.NONE) }),
  z.strictObject({
    kind: z.literal(AuthKind.API_KEY),
    headerName: z.string().regex(AUTH_HEADER_PATTERN),
  }),
  z.strictObject({
    kind: z.literal(AuthKind.BEARER_TOKEN),
    headerName: z.string().regex(AUTH_HEADER_PATTERN).default('Authorization'),
  }),
  z.strictObject({
    kind: z.literal(AuthKind.OAUTH2_PKCE),
    oauth: z.strictObject({
      authorizeUrl: z.string().max(MAX_URL_LENGTH),
      tokenUrl: z.string().max(MAX_URL_LENGTH),
      scopes: z.array(z.string().regex(SCOPE_ID_PATTERN)).max(MAX_SCOPES_PER_MANIFEST),
    }),
  }),
]);

const toolSchema = z.strictObject({
  name: z.string().regex(TOOL_NAME_PATTERN),
  title: z.string().trim().min(1).max(TOOL_TITLE_MAX).optional(),
  description: z.string().trim().min(1).max(TOOL_DESCRIPTION_MAX),
  riskLevel: z.enum(RiskLevel),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
});

const serverSchema = z.strictObject({
  url: z.string().trim().min(1).max(MAX_URL_LENGTH),
  transport: z.enum(McpTransport),
});

const entryFields = {
  publisher: oneLine(PUBLISHER_MAX),
  category: z.string().regex(KEY_PATTERN),
  iconKey: z.string().regex(KEY_PATTERN),
  homepageUrl: z.string().trim().max(MAX_URL_LENGTH).optional(),
  translations: pluginTranslationsSchema,
  server: serverSchema,
  auth: authSchema.default({ kind: AuthKind.NONE }),
  tools: z.array(toolSchema).min(1).max(MAX_TOOLS_PER_MANIFEST),
  allowedPlanSlugs: z.array(z.string().regex(PLAN_SLUG_PATTERN)).max(PLAN_SLUGS_MAX).default([]),
  adminNotes: z
    .string()
    .trim()
    .max(ADMIN_NOTES_MAX)
    .refine((value) => !containsHostileText(value, true), 'must not contain control characters')
    .optional(),
  publish: z.boolean().default(false),
  probeCredential: z.string().min(1).max(PROBE_CREDENTIAL_MAX).optional(),
};

export const updateCuratedBodySchema = z.strictObject(entryFields);

export const createCuratedBodySchema = z.strictObject({
  slug: z.string().regex(SLUG_PATTERN),
  ...entryFields,
});

export const previewCuratedBodySchema = z.strictObject({
  url: z.string().trim().min(1).max(MAX_URL_LENGTH),
  transport: z.enum(McpTransport),
  auth: authSchema.default({ kind: AuthKind.NONE }),
  credential: z.string().min(1).max(PROBE_CREDENTIAL_MAX).optional(),
});

export const listCuratedQuerySchema = z.strictObject({
  includeDeleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const curatedStateBodySchema = z.strictObject({ enabled: z.boolean() });

export const serversQuerySchema = z.strictObject({
  status: z.enum(ServerState).default(ServerState.PENDING_APPROVAL),
});

export const rejectServerBodySchema = z.strictObject({
  reason: oneLine(SERVER_DECISION_REASON_MAX),
});

export const createRuleBodySchema = z
  .strictObject({
    kind: z.enum(HostRuleKind),
    match: z.enum(HostRuleMatch),
    pattern: z.string().trim().min(1).max(HOST_RULE_PATTERN_MAX),
    note: oneLine(HOST_RULE_NOTE_MAX).optional(),
  })
  .superRefine((rule, context) => {
    if (!isValidRulePattern(rule.match, rule.pattern)) {
      context.addIssue({
        code: 'custom',
        path: ['pattern'],
        message: 'pattern does not fit its type',
      });
    }
  });

export const auditQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(AUDIT_PAGE_MAX).default(AUDIT_PAGE_DEFAULT),
  targetType: z.string().max(40).optional(),
});

export const ruleIdSchema = z.uuid();
export const serverIdSchema = z.uuid();

export type CreateCuratedBody = z.infer<typeof createCuratedBodySchema>;
export type UpdateCuratedBody = z.infer<typeof updateCuratedBodySchema>;
export type PreviewCuratedBody = z.infer<typeof previewCuratedBodySchema>;
export type ListCuratedQuery = z.infer<typeof listCuratedQuerySchema>;
export type CuratedStateBody = z.infer<typeof curatedStateBodySchema>;
export type ServersQuery = z.infer<typeof serversQuerySchema>;
export type RejectServerBody = z.infer<typeof rejectServerBodySchema>;
export type CreateRuleBody = z.infer<typeof createRuleBodySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type CuratedAuthBody = z.infer<typeof authSchema>;
