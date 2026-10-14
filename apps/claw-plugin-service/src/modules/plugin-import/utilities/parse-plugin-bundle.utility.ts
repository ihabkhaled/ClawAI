import { ImportComponentKind } from '../../../common/enums/import-component-kind.enum';
import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import { ImportFormat } from '../../../common/enums/import-format.enum';
import { ImportReasonKey } from '../../../common/enums/import-reason-key.enum';
import { ImportRisk } from '../../../common/enums/import-risk.enum';
import { ImportSupport } from '../../../common/enums/import-support.enum';
import { ImportWarning } from '../../../common/enums/import-warning.enum';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import {
  CLAWAI_MANIFEST,
  FALLBACK_VERSION,
  FILE_NAME_UNSAFE,
  GIT_SUFFIX,
  GITHUB_SLUG,
  GITHUB_URL_PREFIX,
  HOMEPAGE_MAX,
  IMPORT_LIMITS,
  MANIFEST_PATHS,
  MARKETPLACE_PATHS,
  ROOT_SKILL_FILE,
  VERSION_POINTS,
} from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import {
  type BundleFile,
  type ImportComponent,
  type ImportPreview,
  type MarketplaceCandidate,
  type ParseInput,
  type ParseResult,
} from '../types/plugin-import.types';
import { assertDeclaredPathsSafe, extractComponents } from './extract-components.utility';
import { parseFrontMatter } from './parse-front-matter.utility';
import { normalizeManifestPath } from './normalize-archive-path.utility';
import { decodeUtf8Strict, parseHostileJson } from './parse-hostile-json.utility';
import {
  firstSegmentIsComponentDirectory,
  isPluginContentPath,
  isStoredPath,
} from './plugin-paths.utility';
import { sanitizeDisplayText } from './sanitize-display-text.utility';

function field(record: Record<string, unknown>, key: string): unknown {
  return Object.entries(record).find(([name]) => name === key)?.[1];
}

function stripWrapperFolder(files: BundleFile[]): BundleFile[] {
  const firsts = new Set(files.map((file) => file.path.split('/')[0]));
  const only = [...firsts][0];
  const wrapped =
    firsts.size === 1 &&
    only !== undefined &&
    files.every((file) => file.path.includes('/')) &&
    !firstSegmentIsComponentDirectory(only);
  return wrapped
    ? files.map((file) => ({ path: file.path.slice(only.length + 1), content: file.content }))
    : files;
}

function scopeTo(files: BundleFile[], directory: string): BundleFile[] {
  const prefix = `${directory}/`;
  return files
    .filter((file) => file.path.startsWith(prefix))
    .map((file) => ({ path: file.path.slice(prefix.length), content: file.content }));
}

function authorText(value: unknown): string {
  if (typeof value === 'string') return sanitizeDisplayText(value, IMPORT_LIMITS.maxNameLength);
  return isPlainRecord(value)
    ? sanitizeDisplayText(field(value, 'name'), IMPORT_LIMITS.maxNameLength)
    : '';
}

function homepageText(manifest: Record<string, unknown>): string {
  const raw = field(manifest, 'homepage') ?? field(manifest, 'repository');
  const value = isPlainRecord(raw) ? field(raw, 'url') : raw;
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.username === ''
      ? url.toString().slice(0, HOMEPAGE_MAX)
      : '';
  } catch {
    return '';
  }
}

function riskOf(components: ImportComponent[]): ImportRisk {
  const code = components.some(
    (component) =>
      component.kind === ImportComponentKind.HOOK || component.reasonKey === ImportReasonKey.STDIO,
  );
  if (code) return ImportRisk.HIGH;
  const remote = components.some((component) => component.support === ImportSupport.USABLE);
  return remote ? ImportRisk.MEDIUM : ImportRisk.LOW;
}

function githubSlug(source: Record<string, unknown>): string | undefined {
  const repo = field(source, 'repo') ?? field(source, 'url');
  if (typeof repo !== 'string') return undefined;
  const slug = repo.replace(GITHUB_URL_PREFIX, '').replace(GIT_SUFFIX, '');
  return GITHUB_SLUG.test(slug) ? slug : undefined;
}

function marketplaceCandidate(entry: unknown): MarketplaceCandidate | undefined {
  if (!isPlainRecord(entry)) return undefined;
  const name = sanitizeDisplayText(field(entry, 'name'), IMPORT_LIMITS.maxNameLength);
  if (name === '') return undefined;
  const candidate: MarketplaceCandidate = {
    name,
    description: sanitizeDisplayText(
      field(entry, 'description'),
      IMPORT_LIMITS.maxDescriptionLength,
    ),
  };
  const source = field(entry, 'source');
  if (typeof source === 'string') candidate.subdir = normalizeManifestPath(source);
  else if (isPlainRecord(source)) candidate.github = githubSlug(source);
  return candidate.subdir === undefined && candidate.github === undefined ? undefined : candidate;
}

function buildMarketplace(raw: Buffer, path: string): ParseResult {
  const parsed = parseHostileJson(raw, path);
  const plugins = isPlainRecord(parsed) ? field(parsed, 'plugins') : undefined;
  if (!isPlainRecord(parsed) || !Array.isArray(plugins)) {
    throw new PluginImportError(ImportErrorCode.MANIFEST_INVALID, `${path} has no plugins list`);
  }
  const candidates = plugins
    .slice(0, IMPORT_LIMITS.maxComponentsPerKind)
    .map((entry) => marketplaceCandidate(entry))
    .filter((candidate) => candidate !== undefined);
  if (candidates.length === 0) {
    throw new PluginImportError(
      ImportErrorCode.NO_PLUGIN_FOUND,
      'marketplace lists no importable plugin',
    );
  }
  return {
    kind: 'MARKETPLACE',
    name: sanitizeDisplayText(field(parsed, 'name'), IMPORT_LIMITS.maxNameLength),
    candidates,
  };
}

function findNestedRoots(files: BundleFile[]): string[] {
  const roots = new Set<string>();
  for (const file of files) {
    for (const manifest of MANIFEST_PATHS) {
      if (file.path.endsWith(`/${manifest}`)) roots.add(file.path.slice(0, -manifest.length - 1));
    }
  }
  return [...roots];
}

function formatOf(manifestPath: string | undefined): ImportFormat {
  if (manifestPath === undefined) return ImportFormat.BARE;
  return manifestPath === CLAWAI_MANIFEST ? ImportFormat.CLAWAI : ImportFormat.CLAUDE;
}

function collectWarnings(
  components: ImportComponent[],
  warnings: Set<string>,
  input: ParseInput,
  hasManifest: boolean,
  hasName: boolean,
): void {
  if (!hasName) warnings.add(ImportWarning.NAME_FROM_SOURCE);
  if (!hasManifest) warnings.add(ImportWarning.NO_MANIFEST);
  if (components.some((component) => component.kind === ImportComponentKind.HOOK)) {
    warnings.add(ImportWarning.HOOKS_NOT_RUN);
  }
  if (components.some((component) => component.reasonKey === ImportReasonKey.STDIO)) {
    warnings.add(ImportWarning.STDIO_NOT_RUN);
  }
  if (input.stats.skippedCount > 0) warnings.add(ImportWarning.FILES_IGNORED);
}

function buildPlugin(input: ParseInput, files: BundleFile[]): ParseResult {
  const map = new Map(files.map((file) => [file.path, file.content] as const));
  const manifestPath = MANIFEST_PATHS.find((path) => map.has(path));
  const manifestBytes = manifestPath === undefined ? undefined : map.get(manifestPath);
  const parsed =
    manifestBytes === undefined ? {} : parseHostileJson(manifestBytes, manifestPath ?? 'manifest');
  if (!isPlainRecord(parsed)) {
    throw new PluginImportError(ImportErrorCode.MANIFEST_INVALID, 'the manifest is not an object');
  }
  assertDeclaredPathsSafe(parsed);
  const warnings = new Set<string>();
  const components = extractComponents({
    files: map,
    manifest: parsed,
    manifestPath: manifestPath ?? '(none)',
    warnings,
  });
  const name = sanitizeDisplayText(field(parsed, 'name'), IMPORT_LIMITS.maxNameLength);
  collectWarnings(components, warnings, input, manifestPath !== undefined, name !== '');
  const stored = files.filter((file) => isStoredPath(file.path));
  for (const file of stored) decodeUtf8Strict(file.content, file.path);
  const preview: ImportPreview = {
    format: formatOf(manifestPath),
    name: name || sanitizeDisplayText(input.fallbackName, IMPORT_LIMITS.maxNameLength) || 'plugin',
    version: sanitizeDisplayText(field(parsed, 'version'), VERSION_POINTS) || FALLBACK_VERSION,
    description: sanitizeDisplayText(
      field(parsed, 'description'),
      IMPORT_LIMITS.maxDescriptionLength,
    ),
    author: authorText(field(parsed, 'author')),
    license: sanitizeDisplayText(field(parsed, 'license'), VERSION_POINTS),
    homepage: homepageText(parsed),
    components,
    risk: riskOf(components),
    warnings: [...warnings].sort(),
    fileCount: input.stats.fileCount,
    keptFileCount: stored.length,
    ignoredFileCount: input.stats.fileCount - stored.length,
    totalBytes: input.stats.totalBytes,
  };
  return { kind: 'PLUGIN', bundle: { preview, files: stored } };
}

/**
 * The Agent Skills layout: a SKILL.md at the root (no manifest, no component folder) is a one-skill
 * plugin. It is re-homed under `skills/<name>/` so the ordinary reader sees a normal skill; the plugin
 * is named from the front matter `name`, else the folder or file name.
 */
function liftRootSkill(input: ParseInput, files: BundleFile[]): ParseInput | undefined {
  const skill = files.find((file) => file.path === ROOT_SKILL_FILE);
  if (skill === undefined || files.some((file) => isPluginContentPath(file.path))) return undefined;
  const { data } = parseFrontMatter(decodeUtf8Strict(skill.content, ROOT_SKILL_FILE));
  const name =
    sanitizeDisplayText(field(data, 'name'), IMPORT_LIMITS.maxNameLength) ||
    sanitizeDisplayText(input.fallbackName, IMPORT_LIMITS.maxNameLength) ||
    'skill';
  const folder = name.replaceAll(FILE_NAME_UNSAFE, '-').replace(/^[.-]+/, '') || 'skill';
  return {
    ...input,
    files: [{ path: `skills/${folder}/${ROOT_SKILL_FILE}`, content: skill.content }],
    fallbackName: name,
    subdir: undefined,
    stripWrapper: false,
  };
}

/**
 * Turns a set of in-memory files into a normalised preview and the inert documents to keep.
 * Understands the Claude Code layout (`.claude-plugin/plugin.json`, `skills/`, `commands/`,
 * `agents/`, `hooks/hooks.json`, `.mcp.json`), the ClawAI layout (`clawai-plugin.json`) and a bare
 * folder with only component directories. A marketplace file answers with its candidates instead.
 */
export function parsePluginBundle(input: ParseInput): ParseResult {
  let files = input.stripWrapper ? stripWrapperFolder(input.files) : input.files;
  if (input.subdir !== undefined && input.subdir !== '') {
    files = scopeTo(files, normalizeManifestPath(input.subdir));
  }
  const lifted = liftRootSkill(input, files);
  if (lifted !== undefined) return buildPlugin(lifted, lifted.files);
  if (files.some((file) => isPluginContentPath(file.path))) return buildPlugin(input, files);
  const marketplacePath = MARKETPLACE_PATHS.find((path) => files.some((f) => f.path === path));
  const marketplace = files.find((file) => file.path === marketplacePath);
  if (marketplacePath !== undefined && marketplace !== undefined) {
    return buildMarketplace(marketplace.content, marketplacePath);
  }
  const nested = findNestedRoots(files);
  const only = nested.length === 1 ? nested[0] : undefined;
  if (only === undefined) {
    throw new PluginImportError(ImportErrorCode.NO_PLUGIN_FOUND, 'no plugin found in this source');
  }
  return parsePluginBundle({
    ...input,
    files: scopeTo(files, only),
    subdir: undefined,
    stripWrapper: false,
  });
}
