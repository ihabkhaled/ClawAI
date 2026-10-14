const KIB = 1024;
const MIB = 1024 * KIB;

export const IMPORT_LIMITS = {
  /** The compressed upload. */
  maxUploadBytes: 5 * MIB,
  maxEntries: 500,
  maxEntryBytes: MIB,
  /** Total uncompressed bytes of every entry, counted before anything is kept. */
  maxUnpackedBytes: 10 * MIB,
  /** Uncompressed / compressed, per entry and for the whole archive. */
  maxCompressionRatio: 100,
  maxPathLength: 240,
  maxPathDepth: 12,
  maxManifestBytes: 256 * KIB,
  maxJsonDepth: 16,
  maxComponentsPerKind: 100,
  maxNameLength: 80,
  maxDescriptionLength: 600,
  maxStoredFileBytes: 256 * KIB,
} as const;

export const IMPORT_GITHUB = {
  hosts: new Set(['api.github.com', 'raw.githubusercontent.com']),
  maxFiles: 150,
  maxTotalBytes: 5 * MIB,
  maxTreeBytes: 2 * MIB,
  requestTimeoutMs: 10_000,
  maxRequests: 170,
  userAgent: 'ClawAI-PluginImport/1',
  sourceMaxLength: 300,
} as const;

export const IMPORT_QUOTA = {
  maxPlugins: 20,
  maxTotalBytes: 20 * MIB,
  maxDrafts: 5,
  draftTtlMs: 30 * 60 * 1000,
} as const;

export const IMPORT_CACHE_CONTROL = 'private, no-store';
export const UPLOAD_FIELD = 'file';
export const CHECKSUM_PATTERN = /^[0-9a-f]{64}$/;
export const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
export const FORBIDDEN_JSON_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);
export const MANIFEST_PATHS: readonly string[] = [
  '.claude-plugin/plugin.json',
  'clawai-plugin.json',
];
export const MARKETPLACE_PATHS: readonly string[] = [
  '.claude-plugin/marketplace.json',
  'clawai-marketplace.json',
  'marketplace.json',
];

export const DRIVE_PREFIX = /^[a-zA-Z]:/;
export const WHITESPACE_RUN = /\s+/g;
export const ARCHIVE_SUFFIX = /\.(zip|tgz|tar\.gz)$/i;
export const TEXT_EXTENSIONS: readonly string[] = [
  '.md',
  '.markdown',
  '.json',
  '.txt',
  '.yaml',
  '.yml',
];
/** Directories whose documents belong to a plugin, at any depth (a marketplace nests plugins). */
export const COMPONENT_DIRECTORIES: ReadonlySet<string> = new Set([
  'skills',
  'commands',
  'agents',
  'hooks',
  'output-styles',
]);
/** Of those, the ones whose files ClawAI KEEPS (as inert text). Hooks are read, never kept. */
export const STORED_DIRECTORIES: ReadonlySet<string> = new Set([
  'skills',
  'commands',
  'agents',
  'output-styles',
]);
export const READ_ONLY_FILES: readonly string[] = ['.mcp.json'];
export const CLAUDE_PLUGIN_DIRECTORY = '.claude-plugin';
export const CLAWAI_MANIFEST = 'clawai-plugin.json';

export const JSON_MAX_NODES = 50_000;
export const VERSION_POINTS = 40;
export const FALLBACK_VERSION = '0.0.0';
export const HOMEPAGE_MAX = 300;
export const HTTPS_URL_MAX = 2048;
export const GITHUB_SLUG = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
export const GITHUB_URL_PREFIX = /^https:\/\/github\.com\//;
export const GIT_SUFFIX = /\.git$/;
export const COMPONENT_PATH_KEYS: readonly string[] = [
  'skills',
  'commands',
  'agents',
  'hooks',
  'mcpServers',
  'outputStyles',
];

export const FRONT_MATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
export const FRONT_MATTER_LINE = /^([A-Za-z][A-Za-z0-9_-]{0,40}):[ \t]*(.*)$/;
export const LINE_BREAK = /\r?\n/;

export const GITHUB_OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export const GITHUB_REPO = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;
export const GITHUB_REF = /^[A-Za-z0-9._\-/]{1,100}$/;
export const HTTP_SCHEME = /^https?:\/\//i;
export const GITHUB_FILE_MARKERS: readonly string[] = [...MANIFEST_PATHS, ...MARKETPLACE_PATHS].map(
  (path) => path.split('/').pop() ?? path,
);
export const GITHUB_REGULAR_FILE_MODES: ReadonlySet<string> = new Set(['100644', '100755']);
export const GITHUB_DOWNLOAD_CONCURRENCY = 4;
export const GITHUB_OVERALL_TIMEOUT_MS = 45_000;
export const GITHUB_RATE_LIMITED_STATUSES: ReadonlySet<number> = new Set([403, 429]);
export const GITHUB_SHA_ACCEPT = 'application/vnd.github.sha';
export const GITHUB_JSON_ACCEPT = 'application/vnd.github+json';
export const PREVIEW_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
export const UPLOAD_OPTIONS = {
  limits: {
    fileSize: IMPORT_LIMITS.maxUploadBytes,
    files: 1,
    fields: 4,
    parts: 6,
    headerPairs: 40,
  },
};
export const UPLOAD_NAME_MAX = 120;
export const UNIQUE_VIOLATION_CODE = 'P2002';
export const TAB_LINE_FEED_CARRIAGE_RETURN: ReadonlySet<number> = new Set([0x09, 0x0a, 0x0d]);
export const C0_LAST = 0x1f;
export const DELETE_CODE = 0x7f;
export const C1_LAST = 0x9f;
