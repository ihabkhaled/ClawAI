import { Locale } from '@claw/shared-types';

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const TOOL_NAME_PATTERN = /^[a-z0-9_]{1,40}$/;
export const SCOPE_ID_PATTERN = /^[a-z][a-z0-9_.:-]{0,39}$/;
export const KEY_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
export const SEMVER_PATTERN = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
export const HOSTNAME_LABEL_PATTERN = /^[a-z0-9-]{1,63}$/;
export const HOSTNAME_TLD_PATTERN = /^[a-z]{2,63}$/;
export const HOSTNAME_MAX_LENGTH = 253;
export const AUTH_HEADER_PATTERN = /^[A-Za-z][A-Za-z0-9-]{0,63}$/;
export const CUSTOM_AUTH_HEADER_PATTERN = /^X-[A-Za-z0-9-]{1,40}$/;
// Inclusive code-point ranges that never belong in catalog text: C0/C1 controls
// (tab and newline are handled separately), the zero-width space, bidi marks,
// overrides and isolates, line/paragraph separators and the BOM, plus invisible
// or formatting-only code points used to smuggle text: the tag block, variation
// selectors, the Arabic letter mark, soft hyphen, combining grapheme joiner,
// Mongolian vowel separator, Hangul filler and interlinear annotation marks.
// ZWNJ and ZWJ (U+200C, U+200D) stay allowed: Persian and Indic scripts need them.
export const HOSTILE_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x0008],
  [0x000b, 0x001f],
  [0x007f, 0x009f],
  [0x00ad, 0x00ad],
  [0x034f, 0x034f],
  [0x061c, 0x061c],
  [0x180e, 0x180e],
  [0x200b, 0x200b],
  [0x200e, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x206f],
  [0x3164, 0x3164],
  [0xfe00, 0xfe0f],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
  [0xe0000, 0xe007f],
  [0xe0100, 0xe01ef],
];
export const LINE_BREAK_CODE_POINTS: readonly number[] = [0x09, 0x0a, 0x0d, 0x2028, 0x2029];

export const ALLOWED_AUTH_HEADERS: readonly string[] = ['authorization', 'x-api-key', 'api-key'];
export const DENIED_AUTH_HEADERS: readonly string[] = [
  'host',
  'cookie',
  'content-length',
  'transfer-encoding',
  'connection',
  'upgrade',
  'mcp-session-id',
];
export const DENIED_AUTH_HEADER_PREFIXES: readonly string[] = ['proxy-', 'sec-'];

// Slugs that would collide with a route segment under /api/v1/plugins.
export const RESERVED_SLUGS: readonly string[] = [
  'admin',
  'catalog',
  'installs',
  'servers',
  'consents',
  'mentions',
  'oauth',
  'invocations',
  'internal',
  'health',
];

export const NATIVE_TOOL_PREFIX = 'plugin';
export const NATIVE_TOOL_NAME_MAX = 64;

export const MANIFEST_VERSION = 1;
export const MANIFEST_MAX_BYTES = 262_144;
export const MAX_TOOLS_PER_MANIFEST = 64;
export const MAX_SCOPES_PER_MANIFEST = 16;
export const MAX_NETWORK_HOSTS = 16;
export const MAX_URL_LENGTH = 2048;
export const TOOL_DESCRIPTION_MAX = 1024;
export const TOOL_TITLE_MAX = 80;
export const NAME_MAX = 80;
export const SUMMARY_MAX = 160;
export const DESCRIPTION_MAX = 2000;
export const PUBLISHER_MAX = 60;
export const SCOPE_DESCRIPTION_MAX = 200;

export const RESULT_BYTES_MAX = 262_144;
export const RESULT_BYTES_DEFAULT = 65_536;
export const TOOL_TIMEOUT_MIN_MS = 1000;
export const TOOL_TIMEOUT_MAX_MS = 60_000;
export const TOOL_TIMEOUT_DEFAULT_MS = 15_000;
export const CALLS_PER_TURN_MAX = 10;
export const CALLS_PER_TURN_DEFAULT = 3;

export const SCHEMA_MAX_BYTES = 16_384;
export const SCHEMA_MAX_DEPTH = 6;
export const SCHEMA_MAX_STRUCTURAL_DEPTH = 24;
export const SCHEMA_MAX_NODES = 2000;
export const SCHEMA_FORBIDDEN_KEYS: readonly string[] = ['__proto__', 'constructor', 'prototype'];
export const SCHEMA_FORBIDDEN_KEYWORDS: readonly string[] = [
  '$id',
  '$anchor',
  '$dynamicRef',
  '$dynamicAnchor',
  '$recursiveRef',
  '$vocabulary',
];
// Keywords whose value is one subschema.
export const SCHEMA_SINGLE_KEYWORDS: readonly string[] = [
  'items',
  'additionalProperties',
  'additionalItems',
  'contains',
  'not',
  'if',
  'then',
  'else',
  'propertyNames',
  'unevaluatedProperties',
  'unevaluatedItems',
];
// Keywords whose value is an array of subschemas.
export const SCHEMA_ARRAY_KEYWORDS: readonly string[] = ['anyOf', 'oneOf', 'allOf', 'prefixItems'];
// Keywords whose value is a map of name -> subschema.
export const SCHEMA_MAP_KEYWORDS: readonly string[] = [
  'properties',
  'patternProperties',
  '$defs',
  'definitions',
  'dependentSchemas',
];

export const CATALOG_DEFAULT_LIMIT = 20;
export const CATALOG_MAX_LIMIT = 50;
export const CATALOG_QUERY_MAX = 80;
export const DEFAULT_LOCALE_FALLBACK = 'en';

export const NON_ROUTABLE_HOST_SUFFIXES: readonly string[] = [
  '.local',
  '.internal',
  '.localhost',
  '.lan',
  '.home',
  '.corp',
];
export const NUMERIC_HOST_PATTERN = /^[\d.]+$/;
export const SETTINGS_SCHEMA_DEFAULT = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

export const ACCEPT_LANGUAGE_MAX_LENGTH = 500;
export const ACCEPT_LANGUAGE_MAX_ENTRIES = 20;
export const CATALOG_CACHE_CONTROL = 'private, max-age=60';
export const RISK_ORDER: readonly string[] = ['READ', 'WRITE', 'DESTRUCTIVE'];

export const SUPPORTED_LOCALES: readonly string[] = Object.values(Locale);
