import {
  CLAUDE_PLUGIN_DIRECTORY,
  COMPONENT_DIRECTORIES,
  MANIFEST_PATHS,
  MARKETPLACE_PATHS,
  READ_ONLY_FILES,
  ROOT_SKILL_FILE,
  STORED_DIRECTORIES,
  TEXT_EXTENSIONS,
} from '../constants/plugin-import.constants';

function hasTextExtension(path: string): boolean {
  const lower = path.toLowerCase();
  return TEXT_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function endsWithPath(path: string, suffix: string): boolean {
  return path === suffix || path.endsWith(`/${suffix}`);
}

function firstSegment(path: string): string {
  return path.split('/')[0] ?? '';
}

/** Decides at READ time which archive entries are worth inflating. Everything else is counted, not read. */
export function isReadablePath(path: string): boolean {
  if (!hasTextExtension(path)) return false;
  const known = [...MANIFEST_PATHS, ...MARKETPLACE_PATHS, ...READ_ONLY_FILES, ROOT_SKILL_FILE];
  return known.some((candidate) => endsWithPath(path, candidate))
    ? true
    : path
        .split('/')
        .slice(0, -1)
        .some((segment) => COMPONENT_DIRECTORIES.has(segment));
}

/** Decides at STORE time (path relative to the plugin root) which files become inert documents. */
export function isStoredPath(path: string): boolean {
  return MANIFEST_PATHS.includes(path)
    ? true
    : hasTextExtension(path) && STORED_DIRECTORIES.has(firstSegment(path)) && path.includes('/');
}

/** A top-level folder that marks a plugin root (also the manifest folder): never an archive wrapper. */
export function firstSegmentIsComponentDirectory(path: string): boolean {
  const first = firstSegment(path);
  return COMPONENT_DIRECTORIES.has(first) || first === CLAUDE_PLUGIN_DIRECTORY;
}

/** True for a path that proves a plugin root: its manifest, or a file inside a component directory. */
export function isPluginContentPath(path: string): boolean {
  return MANIFEST_PATHS.includes(path) || COMPONENT_DIRECTORIES.has(firstSegment(path));
}
