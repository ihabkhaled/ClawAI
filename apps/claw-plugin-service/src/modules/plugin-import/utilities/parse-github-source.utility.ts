import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import {
  CLAUDE_PLUGIN_DIRECTORY,
  GIT_SUFFIX,
  GITHUB_FILE_MARKERS,
  GITHUB_OWNER,
  GITHUB_REF,
  GITHUB_REPO,
  HTTP_SCHEME,
  IMPORT_GITHUB,
} from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import { type GithubCoordinates } from '../types/plugin-import.types';
import { containsWhitespaceOrControl } from './character-classes.utility';
import { normalizeManifestPath } from './normalize-archive-path.utility';

function refuse(reason: string): never {
  throw new PluginImportError(ImportErrorCode.SOURCE_INVALID, reason);
}

/** A pasted file link points at a manifest: the plugin is the folder that holds it (or its parent). */
function directoryOf(path: string): string {
  const segments = path.split('/').filter((segment) => segment !== '');
  const last = segments.at(-1);
  if (last !== undefined && GITHUB_FILE_MARKERS.includes(last)) segments.pop();
  if (segments.at(-1) === CLAUDE_PLUGIN_DIRECTORY) segments.pop();
  return segments.join('/');
}

function build(
  owner: string,
  rawRepo: string,
  ref: string | undefined,
  rest: string,
): GithubCoordinates {
  const repo = rawRepo.replace(GIT_SUFFIX, '');
  if (!GITHUB_OWNER.test(owner) || !GITHUB_REPO.test(repo)) {
    refuse('owner or repository name is not valid');
  }
  if (ref !== undefined && (!GITHUB_REF.test(ref) || ref.includes('..') || ref.startsWith('/'))) {
    refuse('ref is not valid');
  }
  const cleaned = directoryOf(rest);
  return { owner, repo, ref, subdir: cleaned === '' ? '' : normalizeManifestPath(cleaned) };
}

function fromUrl(input: string): GithubCoordinates {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return refuse('source is not a valid URL');
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') {
    refuse('only plain https GitHub links are accepted');
  }
  const segments = url.pathname.split('/').filter((segment) => segment !== '');
  const host = url.hostname.toLowerCase();
  const [owner, repo, ...rest] = segments;
  if (owner === undefined || repo === undefined) return refuse('link has no repository');
  if (host === 'github.com' || host === 'www.github.com') {
    const [mode, ref, ...path] = rest;
    if (mode === undefined) return build(owner, repo, undefined, '');
    return (mode === 'tree' || mode === 'blob') && ref !== undefined
      ? build(owner, repo, decodeURIComponent(ref), path.map(decodeURIComponent).join('/'))
      : refuse('unsupported GitHub link');
  }
  if (host === 'raw.githubusercontent.com') {
    const [ref, ...path] = rest;
    return ref === undefined
      ? refuse('link has no ref')
      : build(owner, repo, decodeURIComponent(ref), path.map(decodeURIComponent).join('/'));
  }
  return refuse('only github.com sources are supported');
}

/**
 * Accepts `owner/repo`, `owner/repo/sub/folder`, `owner/repo@ref`, and github.com / raw.githubusercontent.com
 * links (repo, `/tree/<ref>/<folder>`, `/blob/<ref>/<file>`). Any other host is refused here, before a socket exists.
 * A ref containing `/` cannot be written in a /tree/ link; use the `owner/repo@ref` form for those.
 */
export function parseGithubSource(raw: string): GithubCoordinates {
  const input = raw.trim();
  if (
    input === '' ||
    input.length > IMPORT_GITHUB.sourceMaxLength ||
    containsWhitespaceOrControl(input)
  ) {
    refuse('source is empty, too long or has whitespace');
  }
  if (HTTP_SCHEME.test(input)) return fromUrl(input);
  const at = input.indexOf('@');
  const ref = at === -1 ? undefined : input.slice(at + 1);
  const path = at === -1 ? input : input.slice(0, at);
  const [owner, repo, ...rest] = path.split('/');
  if (owner === undefined || repo === undefined) return refuse('expected owner/repo');
  return build(owner, repo, ref === '' ? undefined : ref, rest.join('/'));
}
