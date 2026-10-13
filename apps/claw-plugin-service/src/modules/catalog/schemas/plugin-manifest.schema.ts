import { z } from 'zod';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { McpTransport } from '../../../common/enums/mcp-transport.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import {
  AUTH_HEADER_PATTERN,
  CALLS_PER_TURN_DEFAULT,
  CALLS_PER_TURN_MAX,
  DESCRIPTION_MAX,
  KEY_PATTERN,
  MANIFEST_VERSION,
  MAX_NETWORK_HOSTS,
  MAX_SCOPES_PER_MANIFEST,
  MAX_TOOLS_PER_MANIFEST,
  MAX_URL_LENGTH,
  NAME_MAX,
  NATIVE_TOOL_NAME_MAX,
  NATIVE_TOOL_PREFIX,
  NON_ROUTABLE_HOST_SUFFIXES,
  NUMERIC_HOST_PATTERN,
  PUBLISHER_MAX,
  RESERVED_SLUGS,
  RESULT_BYTES_DEFAULT,
  RESULT_BYTES_MAX,
  SCOPE_DESCRIPTION_MAX,
  SCOPE_ID_PATTERN,
  SEMVER_PATTERN,
  SETTINGS_SCHEMA_DEFAULT,
  SLUG_PATTERN,
  SUMMARY_MAX,
  TOOL_DESCRIPTION_MAX,
  TOOL_NAME_PATTERN,
  TOOL_TIMEOUT_DEFAULT_MS,
  TOOL_TIMEOUT_MAX_MS,
  TOOL_TIMEOUT_MIN_MS,
  TOOL_TITLE_MAX,
} from '../constants/catalog.constants';
import { isAllowedAuthHeader } from '../utilities/is-allowed-auth-header.utility';
import { isValidHostname } from '../utilities/is-valid-hostname.utility';
import { containsHostileText } from '../utilities/contains-hostile-text.utility';
import { checkJsonSchemaSubset } from '../utilities/json-schema-subset.utility';

const lineText = (min: number, max: number): z.ZodType<string, string> =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (value) => !containsHostileText(value, false),
      'must be one line without control or invisible characters',
    );

const blockText = (min: number, max: number): z.ZodType<string, string> =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (value) => !containsHostileText(value, true),
      'must not contain control or invisible characters',
    );

function isPublicHttpsUrl(value: string): boolean {
  if (value.length > MAX_URL_LENGTH) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.username !== '' || parsed.password !== '' || parsed.hash !== '') return false;
  // An explicit port other than 443 normalises to a non-empty `port`.
  if (parsed.port !== '') return false;
  const host = parsed.hostname.toLowerCase();
  // A trailing dot makes a fully qualified name that skips suffix checks.
  if (host.endsWith('.')) return false;
  return !host.includes('.') || host.startsWith('[') || NUMERIC_HOST_PATTERN.test(host)
    ? false
    : !NON_ROUTABLE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

const httpsUrl = z
  .string()
  .max(MAX_URL_LENGTH)
  .refine(isPublicHttpsUrl, 'must be a public https URL without credentials or fragment');

const jsonSchemaObject = z.record(z.string(), z.unknown()).superRefine((schema, context) => {
  for (const issue of checkJsonSchemaSubset(schema)) {
    context.addIssue({ code: 'custom', message: issue });
  }
  if (schema['type'] !== 'object') {
    context.addIssue({ code: 'custom', message: 'schema root must have type "object"' });
  }
});

const translationText = z.strictObject({
  name: lineText(1, NAME_MAX),
  summary: lineText(1, SUMMARY_MAX),
  description: blockText(1, DESCRIPTION_MAX),
});

// en is required and is the fallback for every other locale. The rest are
// optional here so a curated entry can launch in English first; first-party
// entries are held to all 13 by the seeding tests.
export const pluginTranslationsSchema = z.strictObject({
  en: translationText,
  ar: translationText.optional(),
  de: translationText.optional(),
  es: translationText.optional(),
  fa: translationText.optional(),
  fr: translationText.optional(),
  hi: translationText.optional(),
  it: translationText.optional(),
  ja: translationText.optional(),
  pt: translationText.optional(),
  ru: translationText.optional(),
  th: translationText.optional(),
  zh: translationText.optional(),
});

const scopeSchema = z.strictObject({
  id: z.string().regex(SCOPE_ID_PATTERN),
  description: lineText(1, SCOPE_DESCRIPTION_MAX),
});

const toolSchema = z.strictObject({
  name: z.string().regex(TOOL_NAME_PATTERN),
  title: lineText(1, TOOL_TITLE_MAX),
  description: blockText(1, TOOL_DESCRIPTION_MAX),
  inputSchema: jsonSchemaObject,
  riskLevel: z.enum(RiskLevel),
  scopes: z.array(z.string().regex(SCOPE_ID_PATTERN)).max(MAX_SCOPES_PER_MANIFEST).default([]),
  resultKind: z.literal('text').default('text'),
  maxResultBytes: z.number().int().min(1).max(RESULT_BYTES_MAX).default(RESULT_BYTES_DEFAULT),
  timeoutMs: z
    .number()
    .int()
    .min(TOOL_TIMEOUT_MIN_MS)
    .max(TOOL_TIMEOUT_MAX_MS)
    .default(TOOL_TIMEOUT_DEFAULT_MS),
});

const runtimeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal(RuntimeKind.BUILTIN),
    adapterKey: z.string().regex(SLUG_PATTERN),
  }),
  z.strictObject({
    kind: z.literal(RuntimeKind.MCP_REMOTE),
    server: z.strictObject({ url: httpsUrl, transport: z.enum(McpTransport) }),
  }),
]);

const networkSchema = z
  .strictObject({
    hosts: z
      .array(z.string().refine(isValidHostname, 'must be a host name such as api.example.com'))
      .max(MAX_NETWORK_HOSTS)
      .default([]),
    publicWeb: z.boolean().default(false),
  })
  .default({ hosts: [], publicWeb: false });

const authHeaderName = z
  .string()
  .regex(AUTH_HEADER_PATTERN)
  .refine(isAllowedAuthHeader, 'header name is not allowed for credentials');

const authSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal(AuthKind.NONE) }),
    z.strictObject({ kind: z.literal(AuthKind.API_KEY), headerName: authHeaderName }),
    z.strictObject({ kind: z.literal(AuthKind.BEARER_TOKEN), headerName: authHeaderName }),
    z.strictObject({
      kind: z.literal(AuthKind.OAUTH2_PKCE),
      oauth: z.strictObject({
        authorizeUrl: httpsUrl,
        tokenUrl: httpsUrl,
        scopes: z.array(z.string().regex(SCOPE_ID_PATTERN)).max(MAX_SCOPES_PER_MANIFEST),
        pkce: z.literal(true),
      }),
    }),
  ])
  .default({ kind: AuthKind.NONE });

export const pluginManifestSchema = z
  .strictObject({
    manifestVersion: z.literal(MANIFEST_VERSION),
    slug: z
      .string()
      .regex(SLUG_PATTERN)
      .refine((slug) => !RESERVED_SLUGS.includes(slug), 'slug is reserved'),
    version: z.string().regex(SEMVER_PATTERN),
    publisher: lineText(1, PUBLISHER_MAX),
    category: z.string().regex(KEY_PATTERN),
    iconKey: z.string().regex(KEY_PATTERN),
    homepageUrl: httpsUrl.optional(),
    translations: pluginTranslationsSchema,
    runtime: runtimeSchema,
    network: networkSchema,
    auth: authSchema,
    scopes: z.array(scopeSchema).max(MAX_SCOPES_PER_MANIFEST).default([]),
    settingsSchema: jsonSchemaObject.default(SETTINGS_SCHEMA_DEFAULT),
    tools: z.array(toolSchema).min(1).max(MAX_TOOLS_PER_MANIFEST),
    limits: z
      .strictObject({ maxCallsPerTurn: z.number().int().min(1).max(CALLS_PER_TURN_MAX) })
      .default({ maxCallsPerTurn: CALLS_PER_TURN_DEFAULT }),
  })
  .superRefine((manifest, context) => {
    const scopeIds = new Set(manifest.scopes.map((scope) => scope.id));
    if (scopeIds.size !== manifest.scopes.length) {
      context.addIssue({ code: 'custom', path: ['scopes'], message: 'scope ids must be unique' });
    }
    const seenTools = new Set<string>();
    for (const [index, tool] of manifest.tools.entries()) {
      if (seenTools.has(tool.name)) {
        context.addIssue({
          code: 'custom',
          path: ['tools', index, 'name'],
          message: 'tool names must be unique',
        });
      }
      seenTools.add(tool.name);
      const nativeName = `${NATIVE_TOOL_PREFIX}_${manifest.slug}_${tool.name}`;
      if (nativeName.length > NATIVE_TOOL_NAME_MAX) {
        context.addIssue({
          code: 'custom',
          path: ['tools', index, 'name'],
          message: `native tool name exceeds ${NATIVE_TOOL_NAME_MAX} characters`,
        });
      }
      for (const scope of tool.scopes) {
        if (!scopeIds.has(scope)) {
          context.addIssue({
            code: 'custom',
            path: ['tools', index, 'scopes'],
            message: `scope "${scope}" is not declared`,
          });
        }
      }
    }
    if (manifest.runtime.kind !== RuntimeKind.BUILTIN && manifest.network.publicWeb) {
      context.addIssue({
        code: 'custom',
        path: ['network', 'publicWeb'],
        message: 'only built-in adapters may declare public web access',
      });
    }
  });

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginManifestInput = z.input<typeof pluginManifestSchema>;
export type PluginManifestTool = PluginManifest['tools'][number];
export type PluginManifestTranslations = z.infer<typeof pluginTranslationsSchema>;
