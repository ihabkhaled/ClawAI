#!/usr/bin/env node
// The security pass of every change in one command (rules/69,
// skills/secure-every-change.md):
//
//   1. npm audit over ALL dependencies, development tools included, failing on
//      high and critical advisories that are not in the reviewed allowlist
//      (tools/security/audit-allowlist.json); lower severities print as INFO;
//   2. gitleaks over the working tree (tracked + untracked files, git-ignored
//      files excluded), with .gitleaks.toml, redacted;
//   3. OSV-Scanner over package-lock.json, when it is installed (CI always runs it);
//   4. every workflow action pinned to a full commit SHA;
//   5. the open GitHub code-scanning, Dependabot and secret-scanning alerts.
//
//   npm run security:check
//   npm run security:check -- --level=moderate   fail on moderate advisories too
//   npm run security:check -- --history          also scan the whole git history (about 15 s)
//   npm run security:check -- --outdated         also list root dependencies behind their latest release
//   npm run security:check -- --offline          skip the checks that need the network
//   npm run security:check -- --strict           a SKIPPED check also fails (CI, release)
//   npm run security:check -- --only=audit,pins  run just these steps: audit, gitleaks, history, osv, pins, alerts, outdated
//
// A check that cannot run prints SKIPPED, never PASS. Exit 1 on any FAIL.
import process from 'node:process';

import { isMain } from '../lib/repo.mjs';
import {
  ALERT_KINDS,
  DEFAULT_LEVEL,
  SKIPPED,
  actionPinCheck,
  alertCheck,
  auditChecks,
  osvCheck,
  outdatedCheck,
  outcome,
  renderOutcome,
  repository,
  scanHistory,
  scanWorkingTree,
  severitiesFrom,
  summarise,
} from './scan-lib.mjs';

export const STEP_IDS = ['audit', 'gitleaks', 'history', 'osv', 'pins', 'alerts', 'outdated'];

const USAGE =
  'usage: node tools/security/security-check.mjs [--level=low|moderate|high|critical] [--history] [--outdated] [--offline] [--strict] ' +
  `[--only=${STEP_IDS.join(',')}]`;

export function parseArgs(argv) {
  const options = {
    level: DEFAULT_LEVEL,
    history: false,
    outdated: false,
    offline: false,
    strict: false,
    only: null,
    help: false,
  };
  for (const argument of argv) {
    if (argument === '--history') options.history = true;
    else if (argument === '--outdated') options.outdated = true;
    else if (argument === '--offline') options.offline = true;
    else if (argument === '--strict') options.strict = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument.startsWith('--level=')) options.level = argument.slice('--level='.length);
    else if (argument.startsWith('--only='))
      options.only = argument.slice('--only='.length).split(',');
    else throw new Error(`unknown argument "${argument}"\n${USAGE}`);
  }
  severitiesFrom(options.level); // throws on an unknown level
  const unknown = (options.only ?? []).filter((id) => !STEP_IDS.includes(id));
  if (unknown.length > 0)
    throw new Error(`unknown step "${unknown[0]}"
${USAGE}`);
  return options;
}

const offline = (name) => [outcome(name, SKIPPED, 'skipped: --offline')];

/** The ordered steps of the pass. Each returns one outcome or a list of them. */
export function buildSteps(options, tools = {}) {
  const {
    audit = auditChecks,
    tree = scanWorkingTree,
    history = scanHistory,
    osv = osvCheck,
    pins = actionPinCheck,
    alert = alertCheck,
    outdated = outdatedCheck,
  } = tools;
  const steps = [
    {
      id: 'audit',
      name: 'npm audit',
      run: () => (options.offline ? offline('npm audit') : audit({ level: options.level })),
    },
    { id: 'gitleaks', name: 'gitleaks working tree', run: () => tree() },
  ];
  if (options.history || options.only?.includes('history')) {
    steps.push({ id: 'history', name: 'gitleaks history', run: () => history() });
  }
  steps.push(
    {
      id: 'osv',
      name: 'OSV-Scanner',
      run: () => (options.offline ? offline('OSV-Scanner') : osv()),
    },
    { id: 'pins', name: 'workflow action pins', run: () => pins() },
  );
  for (const kind of ALERT_KINDS) {
    steps.push({
      id: 'alerts',
      name: kind.name,
      run: () => (options.offline ? offline(kind.name) : alert(kind)),
    });
  }
  if (options.outdated || options.only?.includes('outdated')) {
    steps.push({
      id: 'outdated',
      name: 'npm outdated',
      run: () => (options.offline ? offline('npm outdated') : outdated()),
    });
  }
  return options.only ? steps.filter((step) => options.only.includes(step.id)) : steps;
}

/** Run the steps in order, handing each outcome to `onResult` as soon as it exists. */
export function runSteps(steps, onResult = () => {}) {
  const outcomes = [];
  for (const step of steps) {
    let produced;
    try {
      produced = step.run();
    } catch (error) {
      produced = outcome(step.name, SKIPPED, `could not run (${error.message.split('\n')[0]})`);
    }
    for (const entry of Array.isArray(produced) ? produced : [produced]) {
      outcomes.push(entry);
      onResult(entry);
    }
  }
  return outcomes;
}

export function main(
  argv = process.argv.slice(2),
  io = { out: (text) => process.stdout.write(`${text}\n`) },
  tools = {},
) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    io.out(error.message);
    return 2;
  }
  if (options.help) {
    io.out(USAGE);
    return 0;
  }
  io.out(
    `security:check - ${repository()} - fail at ${options.level} and above${options.strict ? ', SKIPPED fails' : ''}`,
  );
  const outcomes = runSteps(buildSteps(options, tools), (entry) => io.out(renderOutcome(entry)));
  const summary = summarise(outcomes, { strict: options.strict });
  io.out(
    `security:check: ${summary.pass} PASS, ${summary.fail} FAIL, ${summary.skipped} SKIPPED, ${summary.info} INFO -> exit ${summary.exitCode}`,
  );
  if (summary.skipped > 0) {
    io.out(
      'SKIPPED is not PASS: the check could not run here. Report it as skipped; CI runs what this machine cannot.',
    );
  }
  return summary.exitCode;
}

if (isMain(import.meta.url)) process.exit(main());
