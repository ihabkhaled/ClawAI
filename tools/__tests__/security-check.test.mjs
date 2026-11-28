// The security pass of every change (rules/69, skills/secure-every-change.md):
// `npm run security:check`, the pre-push security step, and the CI workflows
// that carry the same scans. Every external tool is replaced by a fake runner,
// so nothing here needs a network, gitleaks or gh. Fake secrets are never
// written as literals: the one value that must not be printed is built at run time.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { repoPath } from '../lib/repo.mjs';
import { runPrePushSecurity, scannableRanges } from '../security/pre-push-security.mjs';
import {
  ALERT_KINDS,
  FAIL,
  INFO,
  PASS,
  SKIPPED,
  actionPinCheck,
  alertCheck,
  auditChecks,
  capLines,
  describeVulnerabilities,
  gitleaksReady,
  mirrorFiles,
  osvCheck,
  outdatedCheck,
  parseAuditOutput,
  renderOutcome,
  scanCommitRange,
  scanHistory,
  scanWorkingTree,
  severitiesFrom,
  summarise,
  unpinnedActions,
  updateKind,
  versionAtLeast,
} from '../security/scan-lib.mjs';
import { STEP_IDS, buildSteps, main, parseArgs, runSteps } from '../security/security-check.mjs';

const read = (rel) => readFileSync(repoPath(rel), 'utf8').replace(/\r\n/gu, '\n');
const done = (stdout = '', status = 0, extra = {}) => ({
  status,
  stdout,
  stderr: '',
  missing: false,
  timedOut: false,
  error: null,
  ...extra,
});
const absent = { status: null, stdout: '', stderr: '', missing: true, timedOut: false, error: {} };

// A value the report must never print. Built here so no secret-shaped literal exists.
const HIDDEN = ['never', 'printed', 'value'].join('-');

const advisoryUrl = (id) => `https://github.com/advisories/${id}`;
function report({ high = [], moderate = [], counts } = {}) {
  const vulnerabilities = {};
  for (const [name, id, severity] of [
    ...high.map(([n, id]) => [n, id, 'high']),
    ...moderate.map(([n, id]) => [n, id, 'moderate']),
  ]) {
    vulnerabilities[name] = {
      name,
      severity,
      isDirect: false,
      via: [{ name, severity, title: `${name} flaw`, url: advisoryUrl(id), range: '<2.0.0' }],
      range: '<2.0.0',
      fixAvailable: { name, version: '2.0.0', isSemVerMajor: false },
    };
  }
  return JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: counts ?? {
        low: 0,
        moderate: moderate.length,
        high: high.length,
        critical: 0,
      },
    },
  });
}

/** A runner for npm audit: the production audit (--omit=dev) can differ from the full one. */
function auditRunner({ all, production = all }) {
  return (command, args) => done(args.includes('--omit=dev') ? production : all, 1);
}

// ------------------------------------------------------------------ npm audit

test('audit levels are ordered and an unknown level is refused', () => {
  assert.deepEqual([...severitiesFrom('high')], ['high', 'critical']);
  assert.deepEqual([...severitiesFrom('moderate')], ['moderate', 'high', 'critical']);
  assert.throws(() => severitiesFrom('severe'), /unknown audit level/u);
});

test('an npm audit that cannot run is SKIPPED with the reason, never PASS', () => {
  const offline = JSON.stringify({
    error: { code: 'ENOTFOUND', summary: 'request to the registry failed' },
  });
  assert.match(parseAuditOutput(done(offline, 1)).reason, /could not complete/u);
  assert.match(parseAuditOutput(done('', 1)).reason, /no report/u);
  assert.match(parseAuditOutput(done('{not json', 1)).reason, /not JSON/u);
  assert.match(parseAuditOutput(absent).reason, /could not be started/u);
  for (const runner of [() => done(offline, 1), () => done('', 1), () => absent]) {
    const [check] = auditChecks({ runner, allowlist: {} });
    assert.equal(check.state, SKIPPED);
  }
});

test('a clean audit passes, and counts what a stricter level would show', () => {
  const runner = auditRunner({ all: report({ moderate: [['left-pad', 'GHSA-aaaa-bbbb-cccc']] }) });
  const [check, counts] = auditChecks({ runner, allowlist: {} });
  assert.equal(check.state, PASS);
  assert.equal(counts.state, INFO);
  assert.match(counts.detail, /moderate 1/u);
  assert.match(counts.lines.join('\n'), /moderate left-pad GHSA-aaaa-bbbb-cccc/u);
});

test('an unreviewed high advisory fails with the package, fix and production or development scope', () => {
  const all = report({
    high: [
      ['prod-lib', 'GHSA-1111-2222-3333'],
      ['dev-tool', 'GHSA-4444-5555-6666'],
    ],
  });
  const production = report({ high: [['prod-lib', 'GHSA-1111-2222-3333']] });
  const [check] = auditChecks({ runner: auditRunner({ all, production }), allowlist: {} });
  assert.equal(check.state, FAIL);
  const text = check.lines.join('\n');
  assert.match(text, /high prod-lib GHSA-1111-2222-3333 .*fix: prod-lib@2\.0\.0.*production/u);
  assert.match(text, /high dev-tool GHSA-4444-5555-6666 .*development/u);
});

test('the reviewed allowlist passes an advisory until it expires', () => {
  const runner = auditRunner({ all: report({ high: [['deep', 'GHSA-1111-2222-3333']] }) });
  const entry = { reason: 'no patched release', reviewedBy: 'owner', expires: '2099-01-01' };
  const allowed = auditChecks({ runner, allowlist: { 'GHSA-1111-2222-3333': entry } });
  assert.equal(allowed[0].state, PASS);
  const expired = auditChecks({
    runner,
    allowlist: { 'GHSA-1111-2222-3333': { ...entry, expires: '2020-01-01' } },
    today: '2026-11-28',
  });
  assert.equal(expired[0].state, FAIL);
  assert.match(expired[0].lines.join('\n'), /expired/u);
});

test('level=moderate blocks a moderate advisory that level=high only reports', () => {
  const runner = auditRunner({ all: report({ moderate: [['left-pad', 'GHSA-aaaa-bbbb-cccc']] }) });
  assert.equal(auditChecks({ level: 'high', runner, allowlist: {} })[0].state, PASS);
  assert.equal(auditChecks({ level: 'moderate', runner, allowlist: {} })[0].state, FAIL);
});

test('describeVulnerabilities states the fix: a major upgrade, none, or npm audit fix', () => {
  const base = {
    severity: 'high',
    via: [{ title: 't', url: advisoryUrl('GHSA-x-y-z') }],
    range: '<1',
  };
  const rows = describeVulnerabilities(
    {
      vulnerabilities: {
        major: { ...base, fixAvailable: { name: 'major', version: '9.0.0', isSemVerMajor: true } },
        none: { ...base, fixAvailable: false },
        plain: { ...base, fixAvailable: true },
        indirect: { severity: 'high', via: ['plain'], fixAvailable: true },
      },
    },
    severitiesFrom('high'),
    new Set(['major']),
  );
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  assert.equal(byName.major.fixedIn, 'major@9.0.0 (major upgrade)');
  assert.equal(byName.major.scope, 'production');
  assert.equal(byName.none.fixedIn, 'no fix available');
  assert.equal(byName.none.scope, 'development');
  assert.equal(byName.plain.fixedIn, 'npm audit fix');
  assert.deepEqual(byName.indirect.advisories, ['via plain']);
});

// ------------------------------------------------------------------- gitleaks

test('a gitleaks that is missing or older than 8.25.1 cannot scan, and says why', () => {
  assert.equal(versionAtLeast('8.30.1', '8.25.1'), true);
  assert.equal(versionAtLeast('8.25.1', '8.25.1'), true);
  assert.equal(versionAtLeast('8.25.0', '8.25.1'), false);
  assert.equal(versionAtLeast('8.24.3', '8.25.1'), false);
  assert.equal(versionAtLeast('9.0.0', '8.25.1'), true);
  assert.match(gitleaksReady('gitleaks', () => absent).problem, /not installed/u);
  assert.match(
    gitleaksReady('gitleaks', () => done('8.24.3\n')).problem,
    /older than 8\.25\.1.*allowlists/u,
  );
  assert.equal(gitleaksReady('gitleaks', () => done('v8.30.1\n')).version, '8.30.1');
});

test('mirrorFiles copies regular files only, and reports the large ones it skipped', () => {
  const from = mkdtempSync(join(tmpdir(), 'claw-sec-from-'));
  const to = mkdtempSync(join(tmpdir(), 'claw-sec-to-'));
  try {
    mkdirSync(join(from, 'a', 'b'), { recursive: true });
    mkdirSync(join(from, 'submodule'));
    writeFileSync(join(from, 'a', 'b', 'small.txt'), 'x');
    writeFileSync(join(from, 'big.bin'), 'x'.repeat(50));
    const { copied, large } = mirrorFiles(
      ['a/b/small.txt', 'big.bin', 'gone.txt', 'submodule', '../escape.txt'],
      { from, to, maxBytes: 10 },
    );
    assert.equal(copied, 1);
    assert.deepEqual(large, ['big.bin']);
    assert.ok(existsSync(join(to, 'a', 'b', 'small.txt')));
    assert.ok(!existsSync(join(to, 'big.bin')));
    assert.ok(!existsSync(join(to, 'submodule')), 'a directory (a submodule) is not copied');
  } finally {
    rmSync(from, { recursive: true, force: true });
    rmSync(to, { recursive: true, force: true });
  }
});

/** A gitleaks fake: `version` answers, a `dir`/`git` run exits with `scanStatus` and writes `findings`. */
function gitleaksRunner({ version = '8.30.1', scanStatus = 0, findings = [], seen = [] } = {}) {
  return (command, args, options) => {
    if (args[0] === 'version') return done(`${version}\n`);
    seen.push({ command, args, options });
    const at = args.indexOf('--report-path');
    if (at !== -1) writeFileSync(args[at + 1], JSON.stringify(findings));
    return done('', scanStatus);
  };
}

test('the working-tree scan reads rule, file and line but never prints the secret', () => {
  const seen = [];
  const finding = {
    RuleID: 'generic-api-key',
    File: 'apps/x/src/a.ts',
    StartLine: 7,
    Secret: HIDDEN,
    Match: HIDDEN,
  };
  const result = scanWorkingTree({
    binary: 'gitleaks',
    runner: gitleaksRunner({ scanStatus: 1, findings: [finding], seen }),
    list: () => [],
    mirror: () => ({ copied: 0, large: [] }),
  });
  assert.equal(result.state, FAIL);
  assert.match(result.lines.join('\n'), /generic-api-key apps\/x\/src\/a\.ts:7/u);
  assert.ok(!renderOutcome(result).includes(HIDDEN), 'a secret value must never reach the report');
  const [scan] = seen;
  assert.deepEqual(scan.args.slice(0, 2), ['dir', '.']);
  assert.ok(scan.args.includes('--redact'));
  assert.equal(scan.options.shell, undefined, 'gitleaks is spawned without a shell');
  assert.notEqual(
    scan.options.cwd,
    repoPath(),
    'it scans the mirror, not the working tree with its caches',
  );
});

test('a clean working-tree scan passes and names the large files it did not read', () => {
  const result = scanWorkingTree({
    binary: 'gitleaks',
    runner: gitleaksRunner(),
    list: () => [],
    mirror: () => ({ copied: 12, large: ['video.mp4'] }),
  });
  assert.equal(result.state, PASS);
  assert.match(result.detail, /12 files, gitleaks 8\.30\.1; 1 file\(s\) over 5 MB not scanned/u);
});

test('gitleaks that cannot run is SKIPPED, not PASS and not FAIL', () => {
  for (const scan of [scanWorkingTree, scanHistory]) {
    assert.equal(scan({ binary: 'gitleaks', runner: () => absent }).state, SKIPPED);
    assert.equal(
      scan({ binary: 'gitleaks', runner: gitleaksRunner({ version: '8.24.3' }) }).state,
      SKIPPED,
    );
  }
  assert.equal(
    scanCommitRange('a..b', { binary: 'gitleaks', runner: gitleaksRunner({ scanStatus: 2 }) })
      .state,
    SKIPPED,
  );
});

test('the commit-range and history scans pass the range and the reviewed ignore list as arguments', () => {
  const seen = [];
  const runner = gitleaksRunner({ seen });
  assert.equal(scanCommitRange('origin/main..abc123', { binary: 'gitleaks', runner }).state, PASS);
  assert.equal(scanHistory({ binary: 'gitleaks', runner }).state, PASS);
  const [range, history] = seen.map((entry) => entry.args);
  assert.equal(range[range.indexOf('--log-opts') + 1], 'origin/main..abc123');
  assert.ok(
    !range.includes('--gitleaks-ignore-path'),
    'a range scan never reads the history ignore list',
  );
  assert.equal(history[history.indexOf('--gitleaks-ignore-path') + 1], repoPath('tools/security'));
});

test('the history ignore list holds fingerprints only, one exact historical occurrence per line', () => {
  const lines = read('tools/security/.gitleaksignore')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'));
  assert.ok(lines.length > 0);
  for (const line of lines) {
    assert.match(
      line,
      /^[0-9a-f]{40}:[^:\s][^\s]*:[a-z0-9-]+:\d+$/u,
      `not a commit:file:rule:line fingerprint: ${line}`,
    );
  }
  assert.equal(new Set(lines).size, lines.length, 'no duplicate fingerprint');
});

// ----------------------------------------------------------------- OSV-Scanner

test('OSV-Scanner: clean passes, findings fail, a missing or erroring binary is SKIPPED', () => {
  const clean = osvCheck({
    runner: () =>
      done('Scanned package-lock.json file and found 1464 packages\nNo issues found', 0),
  });
  assert.equal(clean.state, PASS);
  assert.match(clean.detail, /1464 packages/u);
  const found = osvCheck({
    runner: () => done('GHSA-aaaa-bbbb-cccc  7.5  npm  left-pad  1.0.0\n', 1),
  });
  assert.equal(found.state, FAIL);
  assert.match(found.lines.join('\n'), /GHSA-aaaa-bbbb-cccc/u);
  assert.equal(osvCheck({ runner: () => absent }).state, SKIPPED);
  assert.equal(osvCheck({ runner: () => done('', 127) }).state, SKIPPED);
});

// ---------------------------------------------------------------- npm outdated

test('npm outdated is information only: how far behind, never a failure', () => {
  assert.equal(updateKind('1.2.3', '2.0.0'), 'major');
  assert.equal(updateKind('1.2.3', '1.3.0'), 'minor');
  assert.equal(updateKind('1.2.3', '1.2.9'), 'patch');
  assert.equal(updateKind('7.10.1', '8.0.0-rc.36'), 'major');
  const behind = JSON.stringify({
    prisma: { current: '7.10.1', wanted: '7.10.1', latest: '8.0.0' },
    zod: { current: '4.6.7', wanted: '4.6.9', latest: '4.6.9' },
  });
  const result = outdatedCheck({ runner: () => done(behind, 1) });
  assert.equal(result.state, INFO);
  assert.equal(result.detail, '2 behind latest (1 major)');
  assert.deepEqual(result.lines, ['prisma 7.10.1 -> 8.0.0 (major)', 'zod 4.6.7 -> 4.6.9 (patch)']);
  assert.equal(outdatedCheck({ runner: () => done('', 0) }).state, INFO);
  assert.equal(outdatedCheck({ runner: () => absent }).state, SKIPPED);
  assert.equal(outdatedCheck({ runner: () => done('<html>', 1) }).state, SKIPPED);
});

// ---------------------------------------------------------------- GitHub alerts

const kind = (id) => ALERT_KINDS.find((entry) => entry.id === id);

test('open GitHub alerts: none is PASS, each kind is summarised without a secret value', () => {
  assert.equal(alertCheck(kind('dependabot'), { runner: () => done('[]') }).state, PASS);

  const code = alertCheck(kind('code-scanning'), {
    runner: () =>
      done(
        JSON.stringify([
          {
            number: 4,
            rule: { id: 'js/xss', security_severity_level: 'high' },
            most_recent_instance: { location: { path: 'apps/a.ts', start_line: 9 } },
          },
        ]),
      ),
  });
  assert.equal(code.state, FAIL);
  assert.deepEqual(code.lines, ['#4 high js/xss apps/a.ts:9']);

  const dependabot = alertCheck(kind('dependabot'), {
    runner: () =>
      done(
        JSON.stringify([
          {
            number: 2,
            security_advisory: { severity: 'high', ghsa_id: 'GHSA-aaaa-bbbb-cccc' },
            dependency: { package: { name: 'lodash' }, scope: 'development' },
            security_vulnerability: { first_patched_version: { identifier: '4.17.21' } },
          },
        ]),
      ),
  });
  assert.match(
    dependabot.lines[0],
    /#2 high lodash \(development\) GHSA-aaaa-bbbb-cccc fixed in 4\.17\.21/u,
  );

  const secret = alertCheck(kind('secret-scanning'), {
    runner: () =>
      done(
        JSON.stringify([
          {
            number: 1,
            secret_type_display_name: 'GitHub Token',
            secret: HIDDEN,
            html_url: 'https://github.com/x/y/security/secret-scanning/1',
          },
        ]),
      ),
  });
  assert.equal(secret.state, FAIL);
  assert.ok(!renderOutcome(secret).includes(HIDDEN));
});

test('GitHub alerts that cannot be read are SKIPPED with the reason', () => {
  const failing = (stderr) => () => ({ ...done('', 1), stderr });
  assert.match(alertCheck(kind('dependabot'), { runner: () => absent }).detail, /not installed/u);
  assert.match(
    alertCheck(kind('dependabot'), {
      runner: failing('To get started with GitHub CLI, please run: gh auth login'),
    }).detail,
    /not signed in/u,
  );
  assert.match(
    alertCheck(kind('secret-scanning'), {
      runner: failing('gh: Secret scanning is disabled on this repository. (HTTP 404)'),
    }).detail,
    /refused/u,
  );
  assert.equal(alertCheck(kind('dependabot'), { runner: () => done('<html>') }).state, SKIPPED);
  assert.equal(alertCheck(kind('dependabot'), { runner: () => done('{}') }).state, SKIPPED);
});

// -------------------------------------------------------------- action pinning

test('an action must be pinned to a full commit SHA; a tag, a branch or a short SHA is not', () => {
  const sha = 'a'.repeat(40);
  const text = [
    `      - uses: actions/checkout@${sha} # v7.0.1`,
    '      - uses: actions/setup-node@v4',
    '      - uses: actions/cache@main',
    '      - uses: some/action@abc1234',
    '      - uses: ./.github/actions/prepare',
    `      - uses: docker://alpine@sha256:${'b'.repeat(64)}`,
    '      - uses: docker://alpine:3.20',
    "      - uses: 'quoted/action@v1'",
  ].join('\n');
  assert.deepEqual(
    unpinnedActions('x.yml', text).map((entry) => entry.reference),
    [
      'actions/setup-node@v4',
      'actions/cache@main',
      'some/action@abc1234',
      'docker://alpine:3.20',
      'quoted/action@v1',
    ],
  );
});

test('every workflow and composite action in this repository is pinned', () => {
  const result = actionPinCheck();
  assert.equal(result.state, PASS, result.lines.join('\n'));
});

// ---------------------------------------------------------------------- report

test('the report counts states, and a SKIPPED check fails only under --strict', () => {
  const outcomes = [
    { name: 'a', state: PASS, detail: '', lines: [] },
    { name: 'b', state: SKIPPED, detail: '', lines: [] },
    { name: 'c', state: INFO, detail: '', lines: [] },
  ];
  assert.deepEqual(summarise(outcomes), { pass: 1, fail: 0, skipped: 1, info: 1, exitCode: 0 });
  assert.equal(summarise(outcomes, { strict: true }).exitCode, 1);
  assert.equal(
    summarise([...outcomes, { name: 'd', state: FAIL, detail: '', lines: [] }]).exitCode,
    1,
  );
});

test('long detail lists are capped with a count of what was left out', () => {
  const lines = Array.from({ length: 30 }, (_, index) => `line ${index}`);
  assert.equal(capLines(lines, 12).length, 13);
  assert.equal(capLines(lines, 12).at(-1), '... and 18 more');
});

// ------------------------------------------------------------------------- CLI

test('the command line: flags, an unknown level and an unknown step', () => {
  assert.deepEqual(parseArgs([]).only, null);
  const options = parseArgs([
    '--level=moderate',
    '--history',
    '--strict',
    '--offline',
    '--only=audit,pins',
  ]);
  assert.deepEqual(
    {
      level: options.level,
      history: options.history,
      strict: options.strict,
      offline: options.offline,
      only: options.only,
    },
    { level: 'moderate', history: true, strict: true, offline: true, only: ['audit', 'pins'] },
  );
  assert.throws(() => parseArgs(['--level=severe']), /unknown audit level/u);
  assert.throws(() => parseArgs(['--only=nonsense']), /unknown step/u);
  assert.throws(() => parseArgs(['--fast']), /unknown argument/u);
});

test('the steps run in order, --only selects, --offline skips the network ones, a throwing step is SKIPPED', () => {
  const calls = [];
  const tools = {
    audit: () => [{ name: 'npm audit', state: PASS, detail: '', lines: [] }],
    tree: () => {
      calls.push('tree');
      throw new Error('disk full\nsecond line');
    },
    history: () => ({ name: 'history', state: PASS, detail: '', lines: [] }),
    osv: () => ({ name: 'osv', state: PASS, detail: '', lines: [] }),
    pins: () => ({ name: 'pins', state: PASS, detail: '', lines: [] }),
    alert: (entry) => ({ name: entry.name, state: PASS, detail: '', lines: [] }),
  };
  const all = runSteps(buildSteps(parseArgs([]), tools));
  assert.deepEqual(all.map((entry) => entry.name).slice(0, 2), [
    'npm audit',
    'gitleaks working tree',
  ]);
  assert.equal(all[1].state, SKIPPED);
  assert.match(all[1].detail, /disk full/u);
  assert.ok(!all[1].detail.includes('second line'));
  assert.equal(all.length, 1 + 1 + 1 + 1 + ALERT_KINDS.length, 'no history step unless asked');

  assert.deepEqual(
    runSteps(buildSteps(parseArgs(['--only=pins']), tools)).map((entry) => entry.name),
    ['pins'],
  );
  assert.ok(
    runSteps(buildSteps(parseArgs(['--only=history']), tools)).some(
      (entry) => entry.name === 'history',
    ),
  );

  const offline = runSteps(buildSteps(parseArgs(['--offline']), tools));
  const skipped = offline.filter((entry) => entry.state === SKIPPED).map((entry) => entry.detail);
  assert.ok(
    skipped.filter((detail) => /--offline/u.test(detail)).length >= 2 + ALERT_KINDS.length - 1,
  );
  assert.deepEqual(STEP_IDS, ['audit', 'gitleaks', 'history', 'osv', 'pins', 'alerts', 'outdated']);
});

test('main prints a line per check and exits 1 on a FAIL, 0 otherwise, 2 on a usage error', () => {
  const lines = [];
  const io = { out: (text) => lines.push(text) };
  assert.equal(main(['--bogus'], io), 2);
  assert.equal(main(['--help'], io), 0);
  assert.equal(main(['--only=pins', '--offline'], io), 0);
  assert.match(lines.join('\n'), /security:check: 1 PASS, 0 FAIL, 0 SKIPPED/u);
});

test('main exits 1 on a FAIL, and on a SKIPPED only under --strict', () => {
  const quiet = { out: () => {} };
  const step = (state) => () => ({ name: 'x', state, detail: '', lines: [] });
  const tools = (state) => ({
    audit: () => [step(state)()],
    tree: step(PASS),
    osv: step(PASS),
    pins: step(PASS),
    alert: (entry) => ({ name: entry.name, state: PASS, detail: '', lines: [] }),
  });
  assert.equal(main([], quiet, tools(FAIL)), 1);
  assert.equal(main([], quiet, tools(SKIPPED)), 0);
  assert.equal(main(['--strict'], quiet, tools(SKIPPED)), 1);
  assert.equal(main(['--strict'], quiet, tools(PASS)), 0);
});

// ------------------------------------------------------------------- pre-push

test('only real ranges are scanned, each once', () => {
  const zero = '0'.repeat(40);
  assert.deepEqual(scannableRanges(['a..b', 'a..b', `a..${zero}`, 'c..d', 'bad']), [
    'a..b',
    'c..d',
  ]);
});

test('pre-push security stops on a finding, and prints SKIPPED loudly without stopping', () => {
  const out = [];
  const io = { log: (text) => out.push(text), warn: (text) => out.push(text) };
  const pass = (name) => ({ name, state: PASS, detail: '', lines: [] });
  const tools = (scanState) => ({
    scan: (range) => ({
      name: `gitleaks ${range}`,
      state: scanState,
      detail: 'x',
      lines: ['rule f.ts:1'],
    }),
    audit: () => [pass('npm audit'), { name: 'counts', state: INFO, detail: '', lines: [] }],
    pins: () => pass('pins'),
  });
  assert.equal(runPrePushSecurity(['a..b'], { ...io, tools: tools(PASS) }), true);
  assert.equal(runPrePushSecurity(['a..b'], { ...io, tools: tools(FAIL) }), false);
  assert.ok(out.some((text) => text.includes('rule f.ts:1')));
  out.length = 0;
  assert.equal(runPrePushSecurity(['a..b'], { ...io, tools: tools(SKIPPED) }), true);
  assert.match(out.join('\n'), /SKIPPED, not passed/u);
  assert.ok(!out.some((text) => text.includes('counts')), 'the INFO line is not part of the hook');
});

test('an unreviewed advisory stops the push', () => {
  const failing = { name: 'npm audit', state: FAIL, detail: '1', lines: ['high x'] };
  const ok = runPrePushSecurity([], {
    log: () => {},
    warn: () => {},
    tools: {
      audit: () => [failing],
      pins: () => ({ name: 'pins', state: PASS, detail: '', lines: [] }),
    },
  });
  assert.equal(ok, false);
});

test('pre-push runs the security step before any gate and never through a receipt', () => {
  const source = read('tools/gates/pre-push.mjs');
  assert.match(
    source,
    /import \{ runPrePushSecurity \} from '\.\.\/security\/pre-push-security\.mjs'/u,
  );
  assert.ok(source.indexOf('security(ranges)') > source.indexOf('qaEvidenceProblem(ranges)'));
  assert.ok(source.indexOf('security(ranges)') < source.indexOf('for (const ref of targets)'));
  assert.ok(
    !/receiptCovers\([^)]*security/iu.test(source),
    'a receipt proves a tree, not an advisory',
  );
});

// ------------------------------------------------------------- CI and workflows

function job(source, id) {
  const start = source.indexOf(`\n  ${id}:`);
  assert.notEqual(start, -1, `${id} job must exist`);
  const rest = source.slice(start + id.length + 4);
  const next = rest.search(/^ {2}[a-z][a-z0-9-]*:/mu);
  return next === -1 ? rest : rest.slice(0, next);
}
const pinned = (source, name) => ({
  version: new RegExp(`${name}_VERSION: (\\S+)`, 'u').exec(source)?.[1],
  sha: new RegExp(`${name}_SHA256: ([0-9a-f]{64})\\b`, 'u').exec(source)?.[1],
});

test('OSV-Scanner is pinned by version and checksum, identically in ci.yml and the weekly workflow', () => {
  const ci = read('.github/workflows/ci.yml');
  const weekly = read('.github/workflows/security-scan.yml');
  const inCi = pinned(job(ci, 'osv-scan'), 'OSV');
  const inWeekly = pinned(job(weekly, 'dependencies'), 'OSV');
  assert.match(inCi.version, /^\d+\.\d+\.\d+$/u);
  assert.match(inCi.sha, /^[0-9a-f]{64}$/u);
  assert.deepEqual(inWeekly, inCi);
  assert.match(job(ci, 'osv-scan'), /sha256sum -c -/u);
});

test('the OSV job is advisory like policy: visible, and outside CI success', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(job(ci, 'osv-scan'), /continue-on-error: true/u);
  assert.doesNotMatch(job(ci, 'ci-success'), /\bosv-scan\b/u);
});

test('the weekly workflow scans the whole history with the same pinned gitleaks as CI', () => {
  const ci = read('.github/workflows/ci.yml');
  const weekly = read('.github/workflows/security-scan.yml');
  assert.match(weekly, /^ {2}schedule:\n {4}- cron: '[^']+'/mu);
  assert.match(weekly, /^ {2}workflow_dispatch:/mu);
  assert.deepEqual(
    pinned(job(weekly, 'gitleaks-history'), 'GITLEAKS'),
    pinned(job(ci, 'secrets'), 'GITLEAKS'),
  );
  assert.match(job(weekly, 'gitleaks-history'), /fetch-depth: 0/u);
  assert.match(job(weekly, 'gitleaks-history'), /--gitleaks-ignore-path tools\/security/u);
  assert.doesNotMatch(
    job(weekly, 'gitleaks-history'),
    /--log-opts/u,
    'the whole history, not a range',
  );
  assert.match(job(weekly, 'dependencies'), /--level=moderate --strict/u);
  assert.match(weekly, /^permissions:\n {2}contents: read$/mu, 'read-only token');
});

test('every action in the security workflows is pinned and Node comes from .nvmrc', () => {
  const weekly = read('.github/workflows/security-scan.yml');
  assert.deepEqual(unpinnedActions('security-scan.yml', weekly), []);
  assert.doesNotMatch(weekly, /node-version:\s/u);
});

test('the security pass is a root script', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(scripts['security:check'], 'node tools/security/security-check.mjs');
});

// ------------------------------------------------------------ rule, skill, index

test('rule 69 and the skill exist and are reachable from every router and index', () => {
  const rule = 'rules/69-security-pass-on-every-change.md';
  const skill = 'skills/secure-every-change.md';
  assert.ok(existsSync(repoPath(rule)) && existsSync(repoPath(skill)));
  for (const [file, link] of [
    ['rules/README.md', '69-security-pass-on-every-change.md'],
    ['skills/00-index.md', 'secure-every-change.md'],
    ['AGENTS.md', 'rules/69-security-pass-on-every-change.md'],
    ['CLAUDE.md', 'rules/69-security-pass-on-every-change.md'],
    ['CLAUDE.md', 'skills/secure-every-change.md'],
    ['CODEX.md', 'rules/69-security-pass-on-every-change.md'],
  ]) {
    assert.ok(read(file).includes(link), `${file} must link ${link}`);
  }
  const text = read(skill);
  for (const heading of ['## Procedure', '## Tools', '## Failure modes', '## Definition of done']) {
    assert.ok(text.includes(heading), `the skill needs a "${heading}" section`);
  }
});
