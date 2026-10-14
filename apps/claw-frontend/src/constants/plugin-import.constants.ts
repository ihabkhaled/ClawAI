import { PluginImportComponentKind } from '@/enums/plugin-import-component-kind.enum';
import { PluginImportRisk } from '@/enums/plugin-import-risk.enum';
import { PluginImportSourceMode } from '@/enums/plugin-import-source-mode.enum';
import { PluginImportSupport } from '@/enums/plugin-import-support.enum';
import type { ImportedPluginView, PluginImportForm } from '@/types/plugin-import.types';

const MEBIBYTE = 1024 * 1024;

export const PLUGIN_IMPORTS_PATH = '/plugins/imports';
export const PLUGIN_IMPORTS_QUERY_KEY = ['plugins', 'imports'] as const;
export const PLUGIN_IMPORT_UPLOAD_FIELD = 'file';
export const PLUGIN_IMPORT_ACCEPT = '.zip,.tgz,.tar.gz';
/** The service refuses larger uploads; checking here saves the round trip. */
export const PLUGIN_IMPORT_MAX_UPLOAD_BYTES = 5 * MEBIBYTE;
export const PLUGIN_IMPORT_SOURCE_MAX_LENGTH = 300;
export const PLUGIN_IMPORT_UPLOAD_TIMEOUT_MS = 60_000;
export const PLUGIN_IMPORT_EMPTY_LIST: ImportedPluginView[] = [];
export const PLUGIN_IMPORT_EMPTY_FORM: PluginImportForm = {
  mode: PluginImportSourceMode.Github,
  source: '',
  subdir: '',
  file: undefined,
};
export const PLUGIN_IMPORT_COMMIT_SHORT_LENGTH = 12;
export const PLUGIN_IMPORT_HTTP_PAYLOAD_TOO_LARGE = 413;
export const PLUGIN_IMPORT_UPLOAD_TOO_LARGE_KEY = 'pluginImport.errors.uploadTooLarge';

export const PLUGIN_IMPORT_ERROR_KEY_GENERIC = 'pluginImport.errors.generic';

/** Error codes from the plugin service to text. A code not listed here reads as the generic message. */
export const PLUGIN_IMPORT_ERROR_KEYS: Readonly<Record<string, string>> = {
  PLUGIN_IMPORT_SOURCE_INVALID: 'pluginImport.errors.sourceInvalid',
  PLUGIN_IMPORT_SOURCE_UNREACHABLE: 'pluginImport.errors.sourceUnreachable',
  PLUGIN_IMPORT_SOURCE_NOT_FOUND: 'pluginImport.errors.sourceNotFound',
  PLUGIN_IMPORT_SOURCE_RATE_LIMITED: 'pluginImport.errors.rateLimited',
  PLUGIN_IMPORT_UPLOAD_MISSING: 'pluginImport.errors.uploadMissing',
  PLUGIN_IMPORT_UPLOAD_TOO_LARGE: 'pluginImport.errors.uploadTooLarge',
  PLUGIN_IMPORT_ARCHIVE_UNSUPPORTED: 'pluginImport.errors.archiveUnsupported',
  PLUGIN_IMPORT_ARCHIVE_CORRUPT: 'pluginImport.errors.archiveCorrupt',
  PLUGIN_IMPORT_ARCHIVE_TOO_MANY_ENTRIES: 'pluginImport.errors.archiveTooBig',
  PLUGIN_IMPORT_ARCHIVE_TOO_LARGE_UNPACKED: 'pluginImport.errors.archiveTooBig',
  PLUGIN_IMPORT_ARCHIVE_BOMB: 'pluginImport.errors.archiveTooBig',
  PLUGIN_IMPORT_ARCHIVE_ENCRYPTED: 'pluginImport.errors.archiveEncrypted',
  PLUGIN_IMPORT_PATH_UNSAFE: 'pluginImport.errors.pathUnsafe',
  PLUGIN_IMPORT_PATH_TOO_DEEP: 'pluginImport.errors.pathUnsafe',
  PLUGIN_IMPORT_SYMLINK_REJECTED: 'pluginImport.errors.symlink',
  PLUGIN_IMPORT_DUPLICATE_ENTRY: 'pluginImport.errors.duplicateEntry',
  PLUGIN_IMPORT_NON_UTF8: 'pluginImport.errors.nonUtf8',
  PLUGIN_IMPORT_MANIFEST_INVALID: 'pluginImport.errors.manifestInvalid',
  PLUGIN_IMPORT_MANIFEST_TOO_LARGE: 'pluginImport.errors.manifestInvalid',
  PLUGIN_IMPORT_MANIFEST_TOO_DEEP: 'pluginImport.errors.manifestInvalid',
  PLUGIN_IMPORT_MANIFEST_FORBIDDEN_KEY: 'pluginImport.errors.manifestInvalid',
  PLUGIN_IMPORT_NO_PLUGIN_FOUND: 'pluginImport.errors.noPlugin',
  PLUGIN_IMPORT_DRAFT_NOT_FOUND: 'pluginImport.errors.draftExpired',
  PLUGIN_IMPORT_CHECKSUM_MISMATCH: 'pluginImport.errors.checksum',
  PLUGIN_IMPORT_DUPLICATE_PLUGIN: 'pluginImport.errors.duplicatePlugin',
  PLUGIN_IMPORT_QUOTA_PLUGINS: 'pluginImport.errors.quota',
  PLUGIN_IMPORT_QUOTA_BYTES: 'pluginImport.errors.quota',
  PLUGIN_IMPORT_NOT_FOUND: 'pluginImport.errors.draftExpired',
  PLUGIN_IMPORT_FILE_TOO_LARGE: 'pluginImport.errors.uploadTooLarge',
  PLUGIN_IMPORT_CONTENT_INVALID: 'pluginQa.errors.contentInvalid',
  PLUGIN_IMPORT_PARSE_FAILED: 'pluginQa.errors.parseFailed',
  PLUGIN_PLAN_DISABLED: 'pluginImport.errors.planDisabled',
};

export const PLUGIN_IMPORT_RATE_LIMITED_CODE = 'PLUGIN_IMPORT_SOURCE_RATE_LIMITED';
export const PLUGIN_IMPORT_RATE_LIMITED_AT_KEY = 'pluginQa.errors.rateLimitedAt';
export const PLUGIN_IMPORT_MS_PER_SECOND = 1000;

export const PLUGIN_IMPORT_KIND_KEYS: Readonly<Record<PluginImportComponentKind, string>> = {
  [PluginImportComponentKind.Skill]: 'pluginImport.kind.skill',
  [PluginImportComponentKind.Command]: 'pluginImport.kind.command',
  [PluginImportComponentKind.Agent]: 'pluginImport.kind.agent',
  [PluginImportComponentKind.Hook]: 'pluginImport.kind.hook',
  [PluginImportComponentKind.McpServer]: 'pluginImport.kind.mcpServer',
  [PluginImportComponentKind.OutputStyle]: 'pluginImport.kind.outputStyle',
};

export const PLUGIN_IMPORT_SUPPORT_KEYS: Readonly<Record<PluginImportSupport, string>> = {
  [PluginImportSupport.Usable]: 'pluginImport.support.usable',
  [PluginImportSupport.StoredInert]: 'pluginImport.support.storedInert',
  [PluginImportSupport.NotSupported]: 'pluginImport.support.notSupported',
};

export const PLUGIN_IMPORT_SUPPORT_VARIANTS: Readonly<
  Record<PluginImportSupport, 'success' | 'warning' | 'outline'>
> = {
  [PluginImportSupport.Usable]: 'success',
  [PluginImportSupport.StoredInert]: 'outline',
  [PluginImportSupport.NotSupported]: 'warning',
};

export const PLUGIN_IMPORT_REASON_KEYS: Readonly<Record<string, string>> = {
  hooks: 'pluginImport.reason.hooks',
  stdio: 'pluginImport.reason.stdio',
  sse: 'pluginImport.reason.sse',
  'no-skills-store': 'pluginImport.reason.noSkillsStore',
  'no-chat-use': 'pluginImport.reason.noChatUse',
  'url-invalid': 'pluginImport.reason.urlInvalid',
};

export const PLUGIN_IMPORT_WARNING_KEYS: Readonly<Record<string, string>> = {
  'hooks-not-run': 'pluginImport.warning.hooksNotRun',
  'stdio-not-run': 'pluginImport.warning.stdioNotRun',
  'files-ignored': 'pluginImport.warning.filesIgnored',
  'no-manifest': 'pluginImport.warning.noManifest',
  'name-from-source': 'pluginImport.warning.nameFromSource',
  'duplicate-component-name': 'pluginImport.warning.duplicateComponentName',
  'component-limit': 'pluginImport.warning.componentLimit',
};

export const PLUGIN_IMPORT_RISK_KEYS: Readonly<Record<PluginImportRisk, string>> = {
  [PluginImportRisk.Low]: 'pluginImport.review.risk.low',
  [PluginImportRisk.Medium]: 'pluginImport.review.risk.medium',
  [PluginImportRisk.High]: 'pluginImport.review.risk.high',
};

export const PLUGIN_IMPORT_RISK_VARIANTS: Readonly<
  Record<PluginImportRisk, 'success' | 'warning' | 'destructive'>
> = {
  [PluginImportRisk.Low]: 'success',
  [PluginImportRisk.Medium]: 'warning',
  [PluginImportRisk.High]: 'destructive',
};
