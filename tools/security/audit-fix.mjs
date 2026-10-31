#!/usr/bin/env node
// Self-healing production-dependency audit (ADR-202).
//
// A new advisory is EXTERNAL state: nothing in a commit causes it, so a gate
// that only fails cannot stay green. This tool finds every blocking
// (high/critical) production advisory that tools/security/npm-audit.mjs would
// fail on and remediates it the only safe way: pin the dependency to the
// lowest-major patched release with an `overrides` entry (or a bumped range
// where the package is a direct dependency), regenerate the lockfile, and
// re-audit. It never edits the reviewed allowlist and never weakens the check:
// an advisory with no patched release is reported with the exact allowlist
// entry a reviewer must write (reason, reviewedBy, expires).
//
//   node tools/security/audit-fix.mjs            apply the fix in the working tree
//   node tools/security/audit-fix.mjs --dry-run  print the plan only
//   node tools/security/audit-fix.mjs --hook     commit/push hook mode: throttled
//                                                (6 h), stages package.json +
//                                                lockfile, tolerant of an offline registry
//   node tools/security/audit-fix.mjs --ci       scheduled workflow mode (no staging)
//   node tools/security/audit-fix.mjs --force    ignore the hook throttle
//
// Exit 0: nothing to fix, or fixed and verified. Exit 1: a blocking advisory
// remains that a human must decide. Exit 0 with a warning: hook mode could not
// reach the registry (CI and the scheduled workflow catch it).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { git } from '../lib/git.mjs';
import { npmInvocation } from '../lib/npm.mjs';
import { isMain, readJson, repoPath } from '../lib/repo.mjs';
import { auditViolations, blockingAdvisories } from './npm-audit.mjs';

const require = createRequire(import.meta.url);
const BLOCKING = new Set(['high', 'critical']);
const STATE_REL = '.ai/local/audit-fix-state.json';
const THROTTLE_MS = 6 * 60 * 60 * 1000;
const NPM_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------- pure logic

/**
 * Per vulnerable package: the blocking advisory ids that are NOT covered by a
 * live allowlist entry, every advisory range reported for the package (so the
 * chosen release also clears the moderate ones when it can), and whether it is
 * a direct dependency.
 */
export function remediationTargets(
  report,
  allowlist = {},
  today = new Date().toISOString().slice(0, 10),
) {
  const targets = new Map();
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    const own = (vulnerability.via ?? []).filter(
      (via) => typeof via === 'object' && via.name === name,
    );
    const blocking = own.filter((via) => BLOCKING.has(via.severity));
    const open = blocking.filter((via) => {
      const id = /GHSA-[\w-]+/u.exec(via.url ?? '')?.[0];
      const allowed = id ? allowlist[id] : undefined;
      return !allowed || allowed.expires < today;
    });
    if (open.length === 0) continue;
    targets.set(name, {
      name,
      isDirect: vulnerability.isDirect === true,
      ids: open.map((via) => /GHSA-[\w-]+/u.exec(via.url ?? '')?.[0] ?? via.title),
      blockingRanges: open.map((via) => via.range),
      allRanges: own.map((via) => via.range),
    });
  }
  return targets;
}

/**
 * The patched release to pin: not inside any advisory range, no prerelease,
 * from the LOWEST major that has one (smallest behavioural jump), the highest
 * release in that major. Prefers a release that also clears the non-blocking
 * ranges. Returns `{ version, major }` or null when no patched release exists.
 */
export function chooseFix(
  { versions, current, blockingRanges, allRanges },
  semver = require('semver'),
) {
  const stable = versions.filter((v) => semver.valid(v) && semver.prerelease(v) === null);
  const outside = (ranges) =>
    stable.filter((v) =>
      ranges.every((range) => !semver.satisfies(v, range, { includePrerelease: true })),
    );
  const pick = (candidates) => {
    const ahead = candidates.filter((v) => !current || semver.gte(v, current));
    if (ahead.length === 0) return null;
    const lowestMajor = Math.min(...ahead.map((v) => semver.major(v)));
    const inMajor = ahead.filter((v) => semver.major(v) === lowestMajor).sort(semver.compare);
    return inMajor[inMajor.length - 1];
  };
  const version = pick(outside(allRanges)) ?? pick(outside(blockingRanges));
  if (!version) return null;
  return {
    version,
    major: semver.major(version),
    crossesMajor: Boolean(current) && semver.major(version) > semver.major(current),
  };
}

function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

/** package.json text with `overrides[name] = spec`. Null when the file is not plain 2-space JSON. */
export function withOverride(text, name, spec) {
  const eol = detectEol(text);
  const lf = text.replace(/\r\n/gu, '\n');
  const json = JSON.parse(lf);
  if (`${JSON.stringify(json, null, 2)}\n` !== lf) return null;
  json.overrides ??= {};
  json.overrides[name] = spec;
  return `${JSON.stringify(json, null, 2)}\n`.replace(/\n/gu, eol);
}

/** package.json text with a direct dependency range bumped, or null when `name` is not declared. */
export function withDirectRange(text, name, spec) {
  const eol = detectEol(text);
  const lf = text.replace(/\r\n/gu, '\n');
  const json = JSON.parse(lf);
  if (`${JSON.stringify(json, null, 2)}\n` !== lf) return null;
  let found = false;
  for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    if (json[section]?.[name]) {
      json[section][name] = spec;
      found = true;
    }
  }
  return found ? `${JSON.stringify(json, null, 2)}\n`.replace(/\n/gu, eol) : null;
}

const isWorkspaceKey = (key) =>
  key === '' || key.startsWith('apps/') || key.startsWith('packages/');

/**
 * npm rewrites every workspace `version` in the lockfile to match the
 * workspace's package.json. That is unrelated churn in a security commit, so
 * the previous values are kept; dependency edits inside workspace entries stay.
 */
export function keepWorkspaceVersions(previousLock, nextLock) {
  for (const [key, entry] of Object.entries(nextLock.packages ?? {})) {
    const before = previousLock.packages?.[key];
    if (isWorkspaceKey(key) && before?.version !== undefined && entry.version !== undefined) {
      entry.version = before.version;
    }
  }
  if (previousLock.version !== undefined) nextLock.version = previousLock.version;
  return nextLock;
}

/** The allowlist entry a reviewer would write for an advisory with no patched release. */
export function allowlistTemplate(target, today = new Date()) {
  const expires = new Date(today.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  const id = target.ids[0];
  return {
    id,
    entry: {
      package: target.name,
      via: '<dependency path>',
      reason: '<why the vulnerable code path is unreachable>',
      reviewedBy: '<reviewer> (<date>)',
      expires,
      followUp: `Drop this entry when a release of ${target.name} outside ${target.blockingRanges.join(' / ')} exists.`,
    },
  };
}

// ----------------------------------------------------------------- IO helpers

function runNpm(args, options = {}) {
  const [command, argv, extra] = npmInvocation(args);
  return execFileSync(command, argv, {
    ...extra,
    encoding: 'utf8',
    timeout: NPM_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

/** `npm audit --omit=dev --json`; null when the registry cannot be reached. */
export function fetchAuditReport() {
  let stdout;
  try {
    stdout = runNpm(['audit', '--omit=dev', '--json']);
  } catch (error) {
    stdout = typeof error.stdout === 'string' ? error.stdout : '';
  }
  if (!stdout.trim().startsWith('{')) return null;
  const report = JSON.parse(stdout);
  return report.error ? null : report;
}

function publishedVersions(name) {
  const raw = runNpm(['view', name, 'versions', '--json']).trim();
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function installedVersion(name) {
  const lock = readJson(repoPath('package-lock.json'));
  const versions = Object.entries(lock?.packages ?? {})
    .filter(([key]) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`))
    .map(([, entry]) => entry.version)
    .filter(Boolean);
  if (versions.length === 0) return null;
  const semver = require('semver');
  return versions.sort(semver.compare)[0];
}

function manifestPaths() {
  const out = [repoPath('package.json')];
  for (const dir of ['apps', 'packages']) {
    const base = repoPath(dir);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      const file = join(base, entry.name, 'package.json');
      if (entry.isDirectory() && existsSync(file)) out.push(file);
    }
  }
  return out;
}

function stateFile() {
  return repoPath(STATE_REL);
}

function readState() {
  return readJson(stateFile()) ?? {};
}

function writeState(state) {
  mkdirSync(dirname(stateFile()), { recursive: true });
  writeFileSync(stateFile(), `${JSON.stringify(state)}\n`);
}

function hasUnstaged(paths) {
  try {
    git(['diff', '--quiet', '--', ...paths]);
    return false;
  } catch {
    return true;
  }
}

function manifestsStaged() {
  try {
    const staged = git([
      'diff',
      '--cached',
      '--name-only',
      '--',
      'package.json',
      'package-lock.json',
    ]);
    return staged.length > 0;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------- remediation

function applyFix(target, fix) {
  const spec = `^${fix.version}`;
  if (target.isDirect) {
    for (const file of manifestPaths()) {
      const next = withDirectRange(readFileSync(file, 'utf8'), target.name, spec);
      if (next !== null) writeFileSync(file, next);
    }
  } else {
    const file = repoPath('package.json');
    const next = withOverride(readFileSync(file, 'utf8'), target.name, spec);
    if (next === null)
      throw new Error('package.json is not plain 2-space JSON; edit its overrides by hand');
    writeFileSync(file, next);
  }
}

function regenerateLock(targets) {
  const lockFile = repoPath('package-lock.json');
  const previous = JSON.parse(readFileSync(lockFile, 'utf8'));
  // Forget the vulnerable resolutions so npm must resolve them again under the new pin.
  const forget = JSON.parse(JSON.stringify(previous));
  for (const key of Object.keys(forget.packages)) {
    if (
      [...targets].some(
        (name) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`),
      )
    ) {
      delete forget.packages[key];
    }
  }
  writeFileSync(lockFile, `${JSON.stringify(forget, null, 2)}\n`);
  runNpm(['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund']);
  const next = keepWorkspaceVersions(previous, JSON.parse(readFileSync(lockFile, 'utf8')));
  writeFileSync(lockFile, `${JSON.stringify(next, null, 2)}\n`);
}

function stillBlocking(allowlist) {
  const report = fetchAuditReport();
  if (report === null) return null;
  return auditViolations(blockingAdvisories(report), allowlist);
}

/**
 * Returns `{ status, lines }`. status: clean | fixed | blocked | offline |
 * skipped. Restores package.json and the lockfile when a fix does not verify.
 */
export function remediate({ dryRun = false, log = () => {} } = {}) {
  const allowlist = readJson(repoPath('tools/security/audit-allowlist.json'))?.advisories ?? {};
  const report = fetchAuditReport();
  if (report === null)
    return { status: 'offline', lines: ['npm registry unreachable; audit not evaluated'] };
  const targets = remediationTargets(report, allowlist);
  if (targets.size === 0) return { status: 'clean', lines: [] };

  const plan = [];
  const unfixable = [];
  for (const target of targets.values()) {
    const fix = chooseFix({
      versions: publishedVersions(target.name),
      current: installedVersion(target.name),
      blockingRanges: target.blockingRanges,
      allRanges: target.allRanges,
    });
    if (fix) plan.push({ target, fix });
    else unfixable.push(target);
  }
  const lines = plan.map(
    ({ target, fix }) =>
      `${target.ids.join(', ')}: pin ${target.name} to ^${fix.version}${fix.crossesMajor ? ' (major bump; verify the dependent still works)' : ''}`,
  );
  for (const target of unfixable) {
    const { id, entry } = allowlistTemplate(target);
    lines.push(
      `${target.ids.join(', ')}: no patched ${target.name} release exists. A reviewer must add ` +
        `tools/security/audit-allowlist.json "${id}": ${JSON.stringify(entry)} (reason, reviewedBy and the expiry are required)`,
    );
  }
  if (dryRun || plan.length === 0) {
    return { status: unfixable.length > 0 ? 'blocked' : 'clean', lines, plan: plan.length };
  }

  const backups = new Map(
    [...manifestPaths(), repoPath('package-lock.json')].map((f) => [f, readFileSync(f, 'utf8')]),
  );
  const restore = () => {
    for (const [file, text] of backups) writeFileSync(file, text);
  };
  try {
    for (const { target, fix } of plan) {
      log(`audit-fix: pinning ${target.name} to ^${fix.version} (${target.ids.join(', ')})`);
      applyFix(target, fix);
    }
    regenerateLock(plan.map(({ target }) => target.name));
    const remaining = stillBlocking(allowlist);
    if (remaining === null) throw new Error('registry became unreachable while verifying the fix');
    const mine = new Set(plan.flatMap(({ target }) => target.ids));
    const unresolved = remaining.filter((line) => [...mine].some((id) => line.startsWith(id)));
    if (unresolved.length > 0) throw new Error(`re-audit still reports: ${unresolved.join('; ')}`);
  } catch (error) {
    restore();
    return {
      status: 'blocked',
      lines: [...lines, `fix did not verify and was rolled back: ${error.message}`],
    };
  }
  return { status: unfixable.length > 0 ? 'blocked' : 'fixed', lines };
}

// ------------------------------------------------------------------------ CLI

function main() {
  const args = new Set(process.argv.slice(2));
  const hook = args.has('--hook');
  const log = (line) => console.log(line);

  if (hook && !args.has('--force')) {
    const { at } = readState();
    if (at && Date.now() - at < THROTTLE_MS && !manifestsStaged()) {
      log('audit-fix: checked within the last 6 h — skipped (CI and the daily workflow re-check)');
      return;
    }
  }
  if (hook && hasUnstaged(['package.json', 'package-lock.json'])) {
    log(
      'audit-fix: package.json / package-lock.json have unstaged edits — not auto-fixing; run `npm run security:fix` after staging them',
    );
    return;
  }

  const result = remediate({ dryRun: args.has('--dry-run'), log });
  for (const line of result.lines) log(`audit-fix: ${line}`);

  if (result.status === 'offline') {
    log(
      'audit-fix: registry unreachable — not evaluated here; the daily dependency workflow and CI cover it',
    );
    process.exit(0);
  }
  if (hook) writeState({ at: Date.now(), status: result.status });
  if (result.status === 'fixed') {
    if (hook) {
      git(['add', '--', 'package.json', 'package-lock.json']);
      log(
        'audit-fix: AUTO-FIX staged package.json + package-lock.json (patched production dependency)',
      );
    } else {
      log(
        'audit-fix: package.json + package-lock.json updated; commit them as `chore(deps): patch <advisory>`',
      );
    }
    return;
  }
  if (result.status === 'blocked') {
    // A hook only blocks when the commit itself touches the manifests; an
    // unrelated commit must not be held hostage by external state.
    const blocks = !hook || manifestsStaged();
    log(
      `audit-fix: ${blocks ? 'BLOCKED' : 'WARNING (does not block this commit)'} — a human decision is needed (lines above)`,
    );
    process.exit(blocks ? 1 : 0);
  }
  if (!hook) log('audit-fix: no unreviewed high/critical advisory in production dependencies');
}

if (isMain(import.meta.url)) main();
