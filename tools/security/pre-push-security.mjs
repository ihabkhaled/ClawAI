// The security step of the pre-push gate (tools/gates/pre-push.mjs; rules/23,
// rules/69). It judges what is being PUSHED, and it is never skipped by a gate
// receipt (rules/34): a receipt proves a tree, while a secret or an advisory is
// judged at the moment of the push.
//
//   1. gitleaks over the commits being pushed, with .gitleaks.toml;
//   2. npm audit over every dependency (development tools included), failing
//      on a high or critical advisory that is not in the reviewed allowlist;
//   3. every workflow action pinned to a full commit SHA.
//
// Without gitleaks, or with a gitleaks too old to read .gitleaks.toml, or
// without a network for npm audit, the step prints a loud SKIPPED warning and
// goes on: CI scans every push and an offline machine must still be able to
// push. A skipped check is never reported as a pass.
import { ZERO_SHA } from '../lib/git.mjs';
import { FAIL, SKIPPED, actionPinCheck, auditChecks, scanCommitRange } from './scan-lib.mjs';

/** The `<from>..<to>` ranges worth scanning: each once, none that deletes a branch. */
export function scannableRanges(ranges) {
  const seen = new Set();
  for (const range of ranges) {
    const [, to] = String(range).split('..');
    if (!to || to === ZERO_SHA) continue;
    seen.add(range);
  }
  return [...seen];
}

/** True when the push may go ahead. `tools` replaces the real checks in tests. */
export function runPrePushSecurity(
  ranges,
  { log = console.log, warn = console.warn, tools = {} } = {},
) {
  const { scan = scanCommitRange, audit = auditChecks, pins = actionPinCheck } = tools;
  const outcomes = [
    ...scannableRanges(ranges).map((range) => scan(range)),
    ...audit({ level: 'high' }).filter((entry) => entry.state !== 'INFO'),
    pins(),
  ];
  let ok = true;
  for (const entry of outcomes) {
    const text = `pre-push security: ${entry.name}${entry.detail ? ` - ${entry.detail}` : ''}`;
    if (entry.state === FAIL) {
      ok = false;
      warn(`✖ ${text}`);
      for (const line of entry.lines) warn(`    ${line}`);
    } else if (entry.state === SKIPPED) {
      warn(
        `\n⚠ ⚠ ⚠  SKIPPED, not passed: ${text}\n` +
          '        CI runs the same scan on this push; run `npm run security:check` once it can run here.\n',
      );
    } else {
      log(`${text}`);
    }
  }
  return ok;
}
