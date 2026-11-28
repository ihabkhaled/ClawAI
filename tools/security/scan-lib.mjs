// Building blocks of the security pass that runs on every change (rules/69,
// skills/secure-every-change.md). `npm run security:check` and the pre-push
// security step are both made from these. Node standard library only.
//
// Every external tool is spawned WITHOUT a shell: npm through its own JS entry
// point (tools/lib/npm.mjs), gitleaks, gh, git and osv-scanner as plain
// executables. Their arguments carry `&`, `?` and `..`, which a shell would
// change, and Windows quoting is exactly where a scan silently stops looking at
// what it was told to look at.
//
// A check that cannot run reports SKIPPED. It is never PASS: an unverified tree
// is not a verified one (rules/54).
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { npmInvocation } from '../lib/npm.mjs';
import { REPO_ROOT, readJson, repoPath } from '../lib/repo.mjs';
import { auditViolations, blockingAdvisories } from './npm-audit.mjs';

export const PASS = 'PASS';
export const FAIL = 'FAIL';
export const SKIPPED = 'SKIPPED';
export const INFO = 'INFO';

export const SEVERITIES = ['low', 'moderate', 'high', 'critical'];
export const DEFAULT_LEVEL = 'high';

/** Files above this size are not copied into the working-tree scan (reported, never silent). */
export const SCAN_MAX_MEGABYTES = 5;

const MAX_LINES = 12;
const NOT_INSTALLED =
  'gitleaks is not installed (set GITLEAKS_BIN, or winget install gitleaks / brew install gitleaks); CI scans every push';
const GHSA = /GHSA-[\w-]+/u;
const FULL_SHA = /^[0-9a-f]{40}$/u;
const DOCKER_DIGEST = /^docker:\/\/\S+@sha256:[0-9a-f]{64}$/u;

/** `{ name, state, detail, lines }`: one line of the report, plus indented detail lines. */
export function outcome(name, state, detail = '', lines = []) {
  return { name, state, detail, lines };
}

export function firstLine(text) {
  return (
    String(text ?? '')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  );
}

/** At most MAX_LINES lines, with a count of what was left out. */
export function capLines(lines, max = MAX_LINES) {
  if (lines.length <= max) return lines;
  return [...lines.slice(0, max), `... and ${lines.length - max} more`];
}

/** The GitHub repository whose alerts are read (SECURITY_CHECK_REPO overrides it). */
export function repository(env = process.env) {
  return env.SECURITY_CHECK_REPO || 'ihabkhaled/ClawAI';
}

// ------------------------------------------------------------------ spawning

/** Spawn a tool without a shell. Never throws; `missing` says the executable does not exist. */
export function run(command, args, { cwd = REPO_ROOT, timeout = 0, input, env, shell } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    input,
    timeout,
    shell,
    windowsHide: true,
    maxBuffer: 256 * 1024 * 1024,
    env: env ? { ...process.env, ...env } : process.env,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    missing: result.error?.code === 'ENOENT',
    timedOut: result.error?.code === 'ETIMEDOUT',
    error: result.error ?? null,
  };
}

// ------------------------------------------------------------------- npm audit

/** The severities at or above `level` (`high` -> high and critical). */
export function severitiesFrom(level) {
  const index = SEVERITIES.indexOf(level);
  if (index === -1) {
    throw new Error(`unknown audit level "${level}" (use ${SEVERITIES.join(', ')})`);
  }
  return new Set(SEVERITIES.slice(index));
}

/** Run `npm audit --json`. `omitDev` limits it to the production tree. */
export function npmAudit({ omitDev = false, runner = run, cwd = REPO_ROOT } = {}) {
  const [command, args, options] = npmInvocation([
    'audit',
    ...(omitDev ? ['--omit=dev'] : []),
    '--json',
  ]);
  return runner(command, args, { ...options, cwd, timeout: 120_000 });
}

/** `{ report, reason }`: the parsed audit, or why there is none (offline, no lockfile, not JSON). */
export function parseAuditOutput(result) {
  if (result.missing) return { report: null, reason: 'npm could not be started' };
  const text = result.stdout.trim();
  if (!text.startsWith('{')) {
    const why = firstLine(result.stderr) || (result.timedOut ? 'timed out' : 'no output');
    return { report: null, reason: `npm audit produced no report (${why})` };
  }
  let report;
  try {
    report = JSON.parse(text);
  } catch {
    return { report: null, reason: 'npm audit output was not JSON' };
  }
  if (report.error) {
    const why = report.error.summary || report.error.code || 'error';
    return { report: null, reason: `npm audit could not complete (${firstLine(why)})` };
  }
  return { report, reason: '' };
}

function fixText(fix) {
  if (fix === undefined || fix === false) return 'no fix available';
  if (fix === true) return 'npm audit fix';
  return `${fix.name}@${fix.version}${fix.isSemVerMajor ? ' (major upgrade)' : ''}`;
}

/** Vulnerable packages at or above `severities`, worst first, with the fix and prod/dev scope. */
export function describeVulnerabilities(report, severities, productionNames = null) {
  const rank = (severity) => SEVERITIES.indexOf(severity);
  const rows = [];
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    if (!severities.has(vulnerability.severity)) continue;
    const via = vulnerability.via ?? [];
    const advisories = [
      ...new Set(
        via
          .filter((entry) => typeof entry === 'object')
          .map((entry) => GHSA.exec(entry.url ?? '')?.[0] ?? entry.title),
      ),
    ];
    const through = via.filter((entry) => typeof entry === 'string');
    let scope = 'unknown';
    if (productionNames !== null) scope = productionNames.has(name) ? 'production' : 'development';
    rows.push({
      name,
      severity: vulnerability.severity,
      advisories: advisories.length > 0 ? advisories : through.map((entry) => `via ${entry}`),
      range: vulnerability.range ?? '',
      fixedIn: fixText(vulnerability.fixAvailable),
      direct: vulnerability.isDirect === true,
      scope,
    });
  }
  return rows.sort((a, b) => rank(b.severity) - rank(a.severity) || a.name.localeCompare(b.name));
}

export function vulnerabilityLine(row) {
  const where = `${row.scope}${row.direct ? ', direct' : ''}`;
  return (
    `${row.severity} ${row.name} ${row.advisories.join(', ')} (affected ${row.range || 'range n/a'}; ` +
    `fix: ${row.fixedIn}; ${where})`
  );
}

export function severityCounts(report) {
  const counts = report?.metadata?.vulnerabilities ?? {};
  return SEVERITIES.map((level) => `${level} ${counts[level] ?? 0}`).join(', ');
}

/**
 * npm audit over EVERY dependency (development tools included: a compromised
 * build or test tool reaches the artefact). Fails on an advisory at or above
 * `level` that is not in the reviewed allowlist; lower severities are reported
 * as INFO so the owner can see what a stricter level would block.
 */
export function auditChecks({
  level = DEFAULT_LEVEL,
  allowlist = readJson(repoPath('tools/security/audit-allowlist.json'))?.advisories ?? {},
  runner = run,
  today,
  cwd = REPO_ROOT,
} = {}) {
  const name = `npm audit (all dependencies incl. dev, ${level}+, reviewed allowlist)`;
  const parsed = parseAuditOutput(npmAudit({ omitDev: false, runner, cwd }));
  if (parsed.report === null) return [outcome(name, SKIPPED, parsed.reason)];

  const severities = severitiesFrom(level);
  const advisories = blockingAdvisories(parsed.report, severities);
  const errors = auditViolations(advisories, allowlist, today);
  const counts = severityCounts(parsed.report);
  const checks = [];
  const reviewed = [...advisories.keys()].filter((id) => allowlist[id]);

  if (errors.length === 0) {
    checks.push(
      outcome(
        name,
        PASS,
        `${reviewed.length} allowlisted${reviewed.length ? `: ${reviewed.join(', ')}` : ''}`,
      ),
    );
  } else {
    const production = parseAuditOutput(npmAudit({ omitDev: true, runner, cwd })).report;
    const productionNames = production
      ? new Set(Object.keys(production.vulnerabilities ?? {}))
      : null;
    const rows = describeVulnerabilities(parsed.report, severities, productionNames);
    checks.push(
      outcome(name, FAIL, `${errors.length} unreviewed or expired`, [
        ...capLines(errors),
        ...capLines(rows.map(vulnerabilityLine)),
      ]),
    );
  }

  const below = SEVERITIES.filter((severity) => !severities.has(severity));
  const lower = describeVulnerabilities(parsed.report, new Set(below));
  checks.push(
    outcome('npm audit severity counts', INFO, counts, capLines(lower.map(vulnerabilityLine))),
  );
  return checks;
}

// --------------------------------------------------------------- npm outdated

/** `patch`, `minor` or `major`: how far `latest` is ahead of `current`. */
export function updateKind(current, latest) {
  const [a, b] = [current, latest].map((text) =>
    String(text)
      .split('-')[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0),
  );
  if ((b[0] ?? 0) > (a[0] ?? 0)) return 'major';
  if ((b[1] ?? 0) > (a[1] ?? 0)) return 'minor';
  return 'patch';
}

/** Root dependencies behind their latest release. Information only: upgrades go in one reviewed batch. */
export function outdatedCheck({ runner = run, cwd = REPO_ROOT } = {}) {
  const name = 'npm outdated (root dependencies)';
  const [command, args, options] = npmInvocation(['outdated', '--json']);
  const result = runner(command, args, { ...options, cwd, timeout: 120_000 });
  const text = result.stdout.trim();
  if (result.missing || (text !== '' && !text.startsWith('{'))) {
    return outcome(
      name,
      SKIPPED,
      `npm outdated could not run (${firstLine(result.stderr) || 'no answer'})`,
    );
  }
  if (text === '') return outcome(name, INFO, 'every root dependency is current');
  let packages;
  try {
    packages = JSON.parse(text);
  } catch {
    return outcome(name, SKIPPED, 'npm outdated output was not JSON');
  }
  const rows = Object.entries(packages)
    .filter(([, entry]) => entry.current && entry.latest)
    .map(([pkg, entry]) => ({ pkg, kind: updateKind(entry.current, entry.latest), ...entry }))
    .sort((a, b) => a.pkg.localeCompare(b.pkg));
  const majors = rows.filter((row) => row.kind === 'major').length;
  return outcome(
    name,
    INFO,
    `${rows.length} behind latest (${majors} major)`,
    capLines(
      rows.map((row) => `${row.pkg} ${row.current} -> ${row.latest} (${row.kind})`),
      20,
    ),
  );
}

// ------------------------------------------------------------------- gitleaks

export function gitleaksBinary(env = process.env) {
  return env.GITLEAKS_BIN || 'gitleaks';
}

export function gitleaksVersion(binary, runner = run) {
  const result = runner(binary, ['version']);
  if (result.missing || result.status !== 0) return null;
  return result.stdout.trim().replace(/^v/u, '') || null;
}

/**
 * The first gitleaks that reads every `[[allowlists]]` block of .gitleaks.toml
 * (8.25.0 added them, 8.25.1 fixed testing all of them). An older binary ignores
 * the blocks silently and reports test fixtures as secrets: 100 false findings
 * in the working tree on 8.24.3, none on CI's pinned 8.30.1 (2026-11-28).
 */
export const MIN_GITLEAKS_VERSION = '8.25.1';

/** True when dotted version `version` is at least `minimum`. */
export function versionAtLeast(version, minimum) {
  const parse = (text) =>
    String(text)
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parse(version), parse(minimum)];
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

/** `{ version }` of a usable gitleaks, or `{ problem }` saying why this machine cannot scan. */
export function gitleaksReady(binary, runner = run) {
  const version = gitleaksVersion(binary, runner);
  if (version === null) return { problem: NOT_INSTALLED };
  if (!versionAtLeast(version, MIN_GITLEAKS_VERSION)) {
    return {
      problem:
        `gitleaks ${version} is older than ${MIN_GITLEAKS_VERSION}: it ignores the [[allowlists]] in .gitleaks.toml ` +
        'and reports test fixtures as secrets. Upgrade it (CI pins 8.30.1: winget upgrade gitleaks, or the GitHub release)',
    };
  }
  return { version };
}

/** Every file git knows about and has not ignored: tracked plus untracked-but-not-ignored. */
export function scannableFiles({ runner = run, cwd = REPO_ROOT } = {}) {
  const result = runner('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd });
  if (result.status !== 0) throw new Error(`git ls-files failed: ${firstLine(result.stderr)}`);
  return result.stdout.split('\0').filter(Boolean);
}

/**
 * Copy the regular files in `files` from `from` into `to`, keeping their
 * relative paths. Skips submodule directories, symbolic links, files that are
 * gone and files over `maxBytes` (the last are returned so the report can say so).
 */
export function mirrorFiles(
  files,
  { from = REPO_ROOT, to, maxBytes = SCAN_MAX_MEGABYTES * 1024 * 1024 },
) {
  const made = new Set();
  const large = [];
  let copied = 0;
  for (const relative of files) {
    if (relative.split('/').includes('..')) continue;
    const source = join(from, relative);
    let stat;
    try {
      stat = lstatSync(source);
    } catch {
      continue; // listed in the index, deleted in the working tree
    }
    if (!stat.isFile()) continue; // a submodule directory, a link, a directory
    if (stat.size > maxBytes) {
      large.push(relative);
      continue;
    }
    const target = join(to, relative);
    const folder = dirname(target);
    if (!made.has(folder)) {
      mkdirSync(folder, { recursive: true });
      made.add(folder);
    }
    copyFileSync(source, target);
    copied += 1;
  }
  return { copied, large };
}

/** Findings of a gitleaks JSON report as `RuleID File:Line [commit]`, never the secret. */
export function gitleaksFindingLines(reportPath) {
  let findings;
  try {
    findings = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    return [];
  }
  return findings.map((finding) => {
    const commit = finding.Commit ? ` commit ${String(finding.Commit).slice(0, 9)}` : '';
    return `${finding.RuleID} ${finding.File}:${finding.StartLine}${commit}`;
  });
}

function gitleaksFailure(name, result, reportPath) {
  if (result.missing || result.timedOut || result.error) {
    const why = result.timedOut ? 'timed out' : (result.error?.message ?? 'could not start');
    return outcome(name, SKIPPED, `gitleaks could not run (${firstLine(why)})`);
  }
  if (result.status === 1) {
    const lines = gitleaksFindingLines(reportPath);
    return outcome(
      name,
      FAIL,
      `${lines.length} finding(s) (secret values are redacted)`,
      capLines(lines, 20),
    );
  }
  return outcome(
    name,
    SKIPPED,
    `gitleaks exited ${result.status}: ${firstLine(result.stderr || result.stdout)}`,
  );
}

/**
 * gitleaks over the working tree, with the committed .gitleaks.toml. Only the
 * files git tracks or would add are scanned (a copy under the temp directory):
 * a plain `gitleaks dir .` walks node_modules, build caches and nested
 * worktrees, took over four minutes and reported 8,489 findings that all sat
 * in git-ignored files (2026-11-28).
 */
export function scanWorkingTree({
  binary = gitleaksBinary(),
  runner = run,
  list = scannableFiles,
  mirror = mirrorFiles,
} = {}) {
  const name = 'gitleaks (working tree: tracked and untracked files, git-ignored files excluded)';
  const ready = gitleaksReady(binary, runner);
  if (ready.problem) return outcome(name, SKIPPED, ready.problem);
  const { version } = ready;

  const folder = mkdtempSync(join(tmpdir(), 'claw-gitleaks-'));
  const reportPath = join(tmpdir(), `${basename(folder)}.report.json`);
  try {
    const { copied, large } = mirror(list(), { to: folder });
    const result = runner(
      binary,
      [
        'dir',
        '.',
        '--config',
        repoPath('.gitleaks.toml'),
        '--redact',
        '--no-banner',
        '--log-level',
        'error',
        '--max-target-megabytes',
        String(SCAN_MAX_MEGABYTES),
        '--report-format',
        'json',
        '--report-path',
        reportPath,
      ],
      { cwd: folder, timeout: 15 * 60_000 },
    );
    const notes =
      large.length > 0 ? `; ${large.length} file(s) over ${SCAN_MAX_MEGABYTES} MB not scanned` : '';
    if (result.status === 0) {
      return outcome(name, PASS, `${copied} files, gitleaks ${version}${notes}`, capLines(large));
    }
    return gitleaksFailure(name, result, reportPath);
  } finally {
    rmSync(folder, { recursive: true, force: true });
    rmSync(reportPath, { force: true });
  }
}

/** gitleaks over the whole git history, minus the reviewed historical findings. */
export function scanHistory({ binary = gitleaksBinary(), runner = run } = {}) {
  const name = 'gitleaks (whole git history, reviewed historical findings excluded)';
  const ready = gitleaksReady(binary, runner);
  if (ready.problem) return outcome(name, SKIPPED, ready.problem);
  const { version } = ready;
  const reportPath = join(tmpdir(), `claw-gitleaks-history-${process.pid}.json`);
  try {
    const result = runner(
      binary,
      [
        'git',
        '--config',
        repoPath('.gitleaks.toml'),
        '--gitleaks-ignore-path',
        repoPath('tools/security'),
        '--redact',
        '--no-banner',
        '--log-level',
        'error',
        '--report-format',
        'json',
        '--report-path',
        reportPath,
      ],
      { timeout: 15 * 60_000 },
    );
    if (result.status === 0) return outcome(name, PASS, `gitleaks ${version}`);
    return gitleaksFailure(name, result, reportPath);
  } finally {
    rmSync(reportPath, { force: true });
  }
}

/** gitleaks over the commits of one `<from>..<to>` range (pre-push). */
export function scanCommitRange(
  range,
  { binary = gitleaksBinary(), runner = run, cwd = REPO_ROOT } = {},
) {
  const name = `gitleaks (commits ${range})`;
  const ready = gitleaksReady(binary, runner);
  if (ready.problem) return outcome(name, SKIPPED, ready.problem);
  const { version } = ready;
  const reportPath = join(tmpdir(), `claw-gitleaks-range-${process.pid}.json`);
  try {
    const result = runner(
      binary,
      [
        'git',
        '--log-opts',
        range,
        '--config',
        repoPath('.gitleaks.toml'),
        '--redact',
        '--no-banner',
        '--log-level',
        'error',
        '--report-format',
        'json',
        '--report-path',
        reportPath,
      ],
      { cwd, timeout: 10 * 60_000 },
    );
    if (result.status === 0) return outcome(name, PASS, `gitleaks ${version}`);
    return gitleaksFailure(name, result, reportPath);
  } finally {
    rmSync(reportPath, { force: true });
  }
}

// ---------------------------------------------------------------- OSV-Scanner

/** OSV-Scanner over the lockfile, when the binary is installed (CI always runs it). */
export function osvCheck({ env = process.env, runner = run } = {}) {
  const name = 'OSV-Scanner (package-lock.json)';
  const binary = env.OSV_SCANNER_BIN || 'osv-scanner';
  const result = runner(binary, ['scan', 'source', '--lockfile', 'package-lock.json'], {
    timeout: 5 * 60_000,
  });
  if (result.missing) {
    return outcome(
      name,
      SKIPPED,
      'osv-scanner is not installed (OSV_SCANNER_BIN sets the path); CI runs it',
    );
  }
  const text = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0) {
    const packages = /found (\d+) packages?/u.exec(text)?.[1];
    return outcome(
      name,
      PASS,
      packages ? `${packages} packages, no known vulnerability` : 'no known vulnerability',
    );
  }
  if (result.status === 1) {
    const lines = text
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => /GHSA-|CVE-|OSV-|^Total|vulnerabilit/iu.test(line));
    return outcome(name, FAIL, 'known vulnerabilities in the lockfile', capLines(lines, 20));
  }
  return outcome(
    name,
    SKIPPED,
    `osv-scanner exited ${result.status}: ${firstLine(result.stderr || result.stdout)}`,
  );
}

// ------------------------------------------------------- workflow action pins

/** `uses:` references in workflow text that are not a full commit SHA (or a digest). */
export function unpinnedActions(file, text) {
  const found = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    const reference = /^\s*-?\s*uses:\s+(['"]?)([^\s#'"]+)\1/u.exec(line)?.[2];
    if (!reference || reference.startsWith('./')) return;
    const pinned = FULL_SHA.test(reference.split('@')[1] ?? '') || DOCKER_DIGEST.test(reference);
    if (!pinned) found.push({ file, line: index + 1, reference });
  });
  return found;
}

function workflowFiles(root = REPO_ROOT) {
  const files = [];
  const workflows = join(root, '.github', 'workflows');
  if (existsSync(workflows)) {
    for (const entry of readdirSync(workflows)) {
      if (/\.ya?ml$/u.test(entry)) files.push(join('.github', 'workflows', entry));
    }
  }
  const actions = join(root, '.github', 'actions');
  if (existsSync(actions)) {
    for (const entry of readdirSync(actions, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const name of ['action.yml', 'action.yaml']) {
        if (existsSync(join(actions, entry.name, name))) {
          files.push(join('.github', 'actions', entry.name, name));
        }
      }
    }
  }
  return files;
}

/** Every third-party action in every workflow is pinned to a full commit SHA (supply chain). */
export function actionPinCheck({ root = REPO_ROOT } = {}) {
  const name = 'workflow actions pinned to full commit SHAs';
  const files = workflowFiles(root);
  const bad = files.flatMap((file) =>
    unpinnedActions(file.replace(/\\/gu, '/'), readFileSync(join(root, file), 'utf8')),
  );
  if (bad.length === 0) return outcome(name, PASS, `${files.length} workflow/action files`);
  return outcome(
    name,
    FAIL,
    `${bad.length} unpinned reference(s)`,
    capLines(bad.map((entry) => `${entry.file}:${entry.line} ${entry.reference}`)),
  );
}

// ------------------------------------------------------------- GitHub alerts

export const ALERT_KINDS = [
  { id: 'code-scanning', name: 'open code-scanning alerts', summarise: summariseCodeScanning },
  { id: 'dependabot', name: 'open Dependabot alerts', summarise: summariseDependabot },
  {
    id: 'secret-scanning',
    name: 'open secret-scanning alerts',
    summarise: summariseSecretScanning,
  },
];

function summariseCodeScanning(alert) {
  const severity = alert.rule?.security_severity_level || alert.rule?.severity || 'unknown';
  const location = alert.most_recent_instance?.location;
  const where = location?.path ? ` ${location.path}:${location.start_line ?? '?'}` : '';
  return `#${alert.number} ${severity} ${alert.rule?.id ?? alert.rule?.name ?? 'rule'}${where}`;
}

function summariseDependabot(alert) {
  const advisory = alert.security_advisory ?? {};
  const pkg = alert.dependency?.package?.name ?? 'package';
  const scope = alert.dependency?.scope ?? 'unknown';
  const fixed =
    alert.security_vulnerability?.first_patched_version?.identifier ?? 'no patched version';
  return `#${alert.number} ${advisory.severity ?? 'unknown'} ${pkg} (${scope}) ${advisory.ghsa_id ?? ''} fixed in ${fixed}`;
}

function summariseSecretScanning(alert) {
  const type = alert.secret_type_display_name || alert.secret_type || 'secret';
  return `#${alert.number} ${type} (value not shown) ${alert.html_url ?? ''}`.trim();
}

function ghFailureReason(result) {
  const text = `${result.stderr}\n${result.stdout}`;
  if (/gh auth login|not logged in|authentication/iu.test(text)) return '`gh` is not signed in';
  if (/HTTP 403|HTTP 404|disabled|not enabled|Resource not accessible/iu.test(text)) {
    return `GitHub refused the read (${firstLine(text)})`;
  }
  return `the GitHub API call failed (${firstLine(text) || `exit ${result.status}`})`;
}

/** One open-alert check through `gh api`. 0 open -> PASS, any open -> FAIL, unreadable -> SKIPPED. */
export function alertCheck(kind, { slug = repository(), gh = 'gh', runner = run } = {}) {
  const name = `${kind.name} (${slug})`;
  const result = runner(
    gh,
    [
      'api',
      '-H',
      'Accept: application/vnd.github+json',
      `repos/${slug}/${kind.id}/alerts?state=open&per_page=100`,
    ],
    { timeout: 60_000 },
  );
  if (result.missing)
    return outcome(name, SKIPPED, '`gh` is not installed; read the Security tab on GitHub');
  if (result.status !== 0) return outcome(name, SKIPPED, ghFailureReason(result));
  let alerts;
  try {
    alerts = JSON.parse(result.stdout);
  } catch {
    return outcome(name, SKIPPED, 'the GitHub API answer was not JSON');
  }
  if (!Array.isArray(alerts)) return outcome(name, SKIPPED, 'the GitHub API answer was not a list');
  if (alerts.length === 0) return outcome(name, PASS, '0 open');
  const count = alerts.length >= 100 ? '100+' : String(alerts.length);
  return outcome(name, FAIL, `${count} open`, capLines(alerts.map(kind.summarise)));
}

// -------------------------------------------------------------------- report

export function renderOutcome({ name, state, detail, lines }) {
  const head = `${state.padEnd(7)} ${name}${detail ? ` - ${detail}` : ''}`;
  return [head, ...lines.map((line) => `        ${line}`)].join('\n');
}

/** `{ pass, fail, skipped, info }` counts, and the exit code the report implies. */
export function summarise(outcomes, { strict = false } = {}) {
  const count = (state) => outcomes.filter((entry) => entry.state === state).length;
  const summary = {
    pass: count(PASS),
    fail: count(FAIL),
    skipped: count(SKIPPED),
    info: count(INFO),
  };
  const failed = summary.fail > 0 || (strict && summary.skipped > 0);
  return { ...summary, exitCode: failed ? 1 : 0 };
}
