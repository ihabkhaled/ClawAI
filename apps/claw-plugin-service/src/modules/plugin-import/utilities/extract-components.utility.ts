import { ImportComponentKind } from '../../../common/enums/import-component-kind.enum';
import { ImportReasonKey } from '../../../common/enums/import-reason-key.enum';
import { ImportSupport } from '../../../common/enums/import-support.enum';
import { ImportWarning } from '../../../common/enums/import-warning.enum';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import {
  COMPONENT_PATH_KEYS,
  HTTPS_URL_MAX,
  IMPORT_LIMITS,
} from '../constants/plugin-import.constants';
import { type ExtractContext, type ImportComponent } from '../types/plugin-import.types';
import { normalizeManifestPath } from './normalize-archive-path.utility';
import { parseFrontMatter } from './parse-front-matter.utility';
import { decodeUtf8Strict, parseHostileJson } from './parse-hostile-json.utility';
import { nameKey, sanitizeDisplayText } from './sanitize-display-text.utility';

/** Every path string a manifest declares must be a safe relative path, or the whole import is refused. */
export function assertDeclaredPathsSafe(manifest: Record<string, unknown>): void {
  for (const key of COMPONENT_PATH_KEYS) {
    const value = Object.entries(manifest).find(([name]) => name === key)?.[1];
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
      if (typeof candidate === 'string') normalizeManifestPath(candidate);
    }
  }
}

function field(record: Record<string, unknown>, key: string): unknown {
  return Object.entries(record).find(([name]) => name === key)?.[1];
}

class ComponentList {
  private readonly names = new Map<ImportComponentKind, Set<string>>();
  readonly items: ImportComponent[] = [];

  constructor(private readonly warnings: Set<string>) {}

  add(component: ImportComponent): void {
    const seen = this.names.get(component.kind) ?? new Set<string>();
    this.names.set(component.kind, seen);
    if (seen.size >= IMPORT_LIMITS.maxComponentsPerKind) {
      this.warnings.add(ImportWarning.COMPONENT_LIMIT);
      return;
    }
    const key = nameKey(component.name);
    if (seen.has(key)) {
      this.warnings.add(ImportWarning.DUPLICATE_COMPONENT_NAME);
      return;
    }
    seen.add(key);
    this.items.push(component);
  }
}

function documentComponent(
  kind: ImportComponentKind,
  path: string,
  fallbackName: string,
  content: Buffer,
): ImportComponent {
  const { data, body } = parseFrontMatter(decodeUtf8Strict(content, path));
  const name =
    sanitizeDisplayText(field(data, 'name'), IMPORT_LIMITS.maxNameLength) ||
    sanitizeDisplayText(fallbackName, IMPORT_LIMITS.maxNameLength);
  const firstLine = body.split('\n').find((line) => line.trim() !== '');
  const description =
    sanitizeDisplayText(field(data, 'description'), IMPORT_LIMITS.maxDescriptionLength) ||
    sanitizeDisplayText(firstLine, IMPORT_LIMITS.maxDescriptionLength);
  return {
    kind,
    name: name || 'unnamed',
    path,
    description,
    support: ImportSupport.STORED_INERT,
    reasonKey:
      kind === ImportComponentKind.SKILL
        ? ImportReasonKey.NO_SKILLS_STORE
        : ImportReasonKey.NO_CHAT_USE,
  };
}

function baseName(path: string, suffix: string): string {
  const last = path.split('/').pop() ?? path;
  return last.endsWith(suffix) ? last.slice(0, -suffix.length) : last;
}

function extractDocuments(context: ExtractContext, list: ComponentList): void {
  for (const [path, content] of context.files) {
    const segments = path.split('/');
    const folder = segments[0];
    if (folder === 'skills' && segments.at(-1) === 'SKILL.md' && segments.length >= 3) {
      list.add(
        documentComponent(ImportComponentKind.SKILL, path, segments.at(-2) ?? 'skill', content),
      );
    } else if (path.endsWith('.md') && folder === 'commands') {
      list.add(
        documentComponent(ImportComponentKind.COMMAND, path, baseName(path, '.md'), content),
      );
    } else if (path.endsWith('.md') && folder === 'agents') {
      list.add(documentComponent(ImportComponentKind.AGENT, path, baseName(path, '.md'), content));
    } else if (path.endsWith('.md') && folder === 'output-styles') {
      list.add(
        documentComponent(ImportComponentKind.OUTPUT_STYLE, path, baseName(path, '.md'), content),
      );
    }
  }
}

function hookEvents(value: unknown): Record<string, unknown> | undefined {
  if (!isPlainRecord(value)) return undefined;
  const nested = field(value, 'hooks');
  return isPlainRecord(nested) ? nested : value;
}

function extractHooks(context: ExtractContext, list: ComponentList): void {
  const declared = field(context.manifest, 'hooks');
  const declaredPath = typeof declared === 'string' ? normalizeManifestPath(declared) : undefined;
  const path = declaredPath ?? 'hooks/hooks.json';
  const fileBytes = context.files.get(path);
  const source = fileBytes === undefined ? declared : parseHostileJson(fileBytes, 'hooks.json');
  const events = hookEvents(source);
  if (events === undefined) return;
  for (const [event, entries] of Object.entries(events)) {
    list.add({
      kind: ImportComponentKind.HOOK,
      name: sanitizeDisplayText(event, IMPORT_LIMITS.maxNameLength) || 'hook',
      path: fileBytes === undefined ? context.manifestPath : path,
      description: String(Array.isArray(entries) ? entries.length : 1),
      support: ImportSupport.NOT_SUPPORTED,
      reasonKey: ImportReasonKey.HOOKS,
    });
  }
}

function remoteUrl(spec: Record<string, unknown>): string | undefined {
  const raw = field(spec, 'url');
  const url = typeof raw === 'string' ? raw.trim() : '';
  try {
    const parsed = new URL(url);
    const valid =
      url.length <= HTTPS_URL_MAX &&
      parsed.protocol === 'https:' &&
      parsed.username === '' &&
      parsed.password === '' &&
      parsed.hostname !== '';
    return valid ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function serverComponent(rawName: string, spec: unknown, path: string): ImportComponent {
  const name = sanitizeDisplayText(rawName, IMPORT_LIMITS.maxNameLength) || 'server';
  const base = { kind: ImportComponentKind.MCP_SERVER, name, path, description: '' };
  const unsupported = (reasonKey: ImportReasonKey): ImportComponent => ({
    ...base,
    support: ImportSupport.NOT_SUPPORTED,
    reasonKey,
  });
  if (!isPlainRecord(spec)) return unsupported(ImportReasonKey.URL_INVALID);
  if (typeof field(spec, 'command') === 'string') return unsupported(ImportReasonKey.STDIO);
  if (field(spec, 'type') === 'sse') return unsupported(ImportReasonKey.SSE);
  const url = remoteUrl(spec);
  return url === undefined
    ? unsupported(ImportReasonKey.URL_INVALID)
    : { ...base, support: ImportSupport.USABLE, url };
}

function serverMap(value: unknown): Record<string, unknown> | undefined {
  if (!isPlainRecord(value)) return undefined;
  const nested = field(value, 'mcpServers');
  if (isPlainRecord(nested)) return nested;
  return Object.values(value).every((entry) => isPlainRecord(entry)) ? value : undefined;
}

function extractMcpServers(context: ExtractContext, list: ComponentList): void {
  const declared = field(context.manifest, 'mcpServers');
  const sources: Array<{ value: unknown; path: string }> = [];
  const file = context.files.get('.mcp.json');
  if (file !== undefined) {
    sources.push({ value: parseHostileJson(file, '.mcp.json'), path: '.mcp.json' });
  }
  if (typeof declared === 'string') {
    const path = normalizeManifestPath(declared);
    const bytes = context.files.get(path);
    if (bytes !== undefined && path !== '.mcp.json') {
      sources.push({ value: parseHostileJson(bytes, path), path });
    }
  } else if (declared !== undefined) {
    sources.push({ value: declared, path: context.manifestPath });
  }
  for (const source of sources) {
    const servers = serverMap(source.value);
    if (servers === undefined) continue;
    for (const [name, spec] of Object.entries(servers)) {
      list.add(serverComponent(name, spec, source.path));
    }
  }
}

/** Every component the bundle declares, with what ClawAI does with it today. Never executes anything. */
export function extractComponents(context: ExtractContext): ImportComponent[] {
  const list = new ComponentList(context.warnings);
  extractDocuments(context, list);
  extractHooks(context, list);
  extractMcpServers(context, list);
  return list.items;
}
