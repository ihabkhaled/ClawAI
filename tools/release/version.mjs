#!/usr/bin/env node
// Conventional-commit version bump for the whole monorepo.
//
// Every push to main produces a release, so this never returns "no bump":
// `feat` raises the minor, a `!` marker or a BREAKING CHANGE footer raises the
// major, and anything else — chore, docs, refactor, test, ci — still raises the
// patch. A commit that parses as nothing conventional is treated as a patch
// rather than ignored, because silently skipping it would publish a release
// whose notes omit real work.
//
// The bump is applied to EVERY workspace, not just the root: tools/__tests__/
// workspace-versions.test.mjs enforces that all 25 workspaces and every
// internal @claw/* dependency pin carry the root version. Bumping the root
// alone turns that test red on the next push.
//
//   node tools/release/version.mjs --from <ref> [--to <ref>] [--dry-run] [--json]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { discoverWorkspaces, isMain, readText, repoPath } from '../lib/repo.mjs';

/** Ordered weakest → strongest so a reduce can take the maximum. */
export const BUMP_ORDER = ['patch', 'minor', 'major'];

const HEADER = /^(?<type>[A-Za-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:[ \t]*(?<description>.*)$/u;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/mu;

// ASCII record/unit separators: git emits them verbatim and no commit subject
// or body can contain them, so parsing never breaks on a newline in a message.
const RECORD_SEPARATOR = '\u001e';
const FIELD_SEPARATOR = '\u001f';

/**
 * Parse one commit into its conventional-commit parts. `type` is null when the
 * subject is not conventional, which the caller floors to a patch.
 */
export function parseCommit({ sha = '', subject = '', body = '', author = '' } = {}) {
  const match = HEADER.exec(subject.trim());
  const type = match ? match.groups.type.toLowerCase() : null;
  const breaking = Boolean(match?.groups.bang) || BREAKING_FOOTER.test(body);
  return {
    sha,
    author,
    subject: subject.trim(),
    body,
    type,
    scope: match?.groups.scope?.trim() || null,
    description: (match?.groups.description ?? subject).trim(),
    breaking,
    breakingNote: extractBreakingNote(body),
  };
}

function extractBreakingNote(body) {
  const lines = String(body).split(/\r?\n/u);
  const start = lines.findIndex((line) => BREAKING_FOOTER.test(line));
  if (start === -1) return null;
  const note = [lines[start].replace(BREAKING_FOOTER, '').trim()];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || /^[A-Za-z-]+:/u.test(line)) break;
    note.push(line.trim());
  }
  return note.join(' ').trim() || null;
}

/**
 * The strongest bump the given commits justify, floored at patch so that every
 * push to main is releasable.
 */
export function bumpLevelFor(commits) {
  let level = 'patch';
  const raise = (candidate) => {
    if (BUMP_ORDER.indexOf(candidate) > BUMP_ORDER.indexOf(level)) level = candidate;
  };
  for (const commit of commits) {
    if (commit.breaking) raise('major');
    else if (commit.type === 'feat') raise('minor');
  }
  return level;
}

/** Semver arithmetic. Pre-release and build metadata are dropped by design. */
export function nextVersion(current, level) {
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(String(current).trim());
  if (!match) throw new Error(`not a semver version: ${current}`);
  const [major, minor, patch] = match.slice(1, 4).map(Number);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Rewrite the version and every internal @claw/* pin in one package.json's
 * TEXT. Text rather than JSON.parse/stringify so key order, spacing and the
 * trailing newline survive byte-for-byte — a reformatted package.json would
 * show up as an unrelated diff in every release commit.
 *
 * A pin of `*` is left alone: workspace-versions.test.mjs accepts it as a
 * deliberate "any local version" marker.
 */
export function rewriteVersions(source, version) {
  const withVersion = source.replace(
    /("version"[ \t]*:[ \t]*)"[^"]*"/u,
    (_match, prefix) => `${prefix}"${version}"`,
  );
  return withVersion.replace(
    /("@claw\/[A-Za-z0-9._-]+"[ \t]*:[ \t]*)"([^"]*)"/gu,
    (match, prefix, current) => (current === '*' ? match : `${prefix}"${version}"`),
  );
}

/** Every package.json this bump has to touch, repo-relative. */
export function versionedManifests({ workspaces = discoverWorkspaces() } = {}) {
  return ['package.json', ...workspaces.map((workspace) => `${workspace.dir}/package.json`)];
}

/**
 * Apply `version` to every manifest. Returns the repo-relative paths that
 * actually changed, so a caller can stage exactly those.
 */
export function applyVersion(
  version,
  { manifests = versionedManifests(), read = readText, write = writeFileSync } = {},
) {
  const changed = [];
  for (const relative of manifests) {
    const absolute = repoPath(relative);
    const source = read(absolute);
    if (source === null) continue;
    const updated = rewriteVersions(source, version);
    if (updated !== source) {
      write(absolute, updated);
      changed.push(relative);
    }
  }
  return changed;
}

/** Read commits in `from..to` (or the whole history when `from` is empty). */
export function readCommits({ from, to = 'HEAD', git = runGit } = {}) {
  const range = from ? `${from}..${to}` : to;
  const raw = git([
    'log',
    '--no-merges',
    `--format=%H${FIELD_SEPARATOR}%s${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%b${RECORD_SEPARATOR}`,
    range,
  ]);
  return raw
    .split(RECORD_SEPARATOR)
    .map((record) => record.replace(/^\r?\n/u, ''))
    .filter((record) => record.trim() !== '')
    .map((record) => {
      const [sha = '', subject = '', author = '', body = ''] = record.split(FIELD_SEPARATOR);
      return parseCommit({ sha, subject, author, body });
    });
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function argValue(args, name) {
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  if (prefixed) return prefixed.slice(name.length + 1);
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : undefined;
}

export function run({ args = process.argv.slice(2), write = (text) => process.stdout.write(text) } = {}) {
  const from = argValue(args, '--from') ?? '';
  const to = argValue(args, '--to') ?? 'HEAD';
  const dryRun = args.includes('--dry-run');

  const rootPackage = JSON.parse(readText(repoPath('package.json')) ?? '{}');
  const current = rootPackage.version;
  const commits = readCommits({ from, to });
  const level = bumpLevelFor(commits);
  const next = nextVersion(current, level);
  const changed = dryRun ? [] : applyVersion(next);

  write(
    `${JSON.stringify({ current, next, level, commits: commits.length, changed }, null, 2)}\n`,
  );
  return { current, next, level, commits, changed };
}

if (isMain(import.meta.url)) run();
