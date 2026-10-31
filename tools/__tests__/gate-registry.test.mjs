// Local and CI cannot drift (ADR-202): every CI job is claimed by a registry
// entry, and every entry points at enforcement that really exists.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { GATES } from '../gates/registry.mjs';
import { repoPath } from '../lib/repo.mjs';

const WORKFLOWS = repoPath('.github', 'workflows');
const read = (rel) => readFileSync(repoPath(rel), 'utf8');

function jobsOf(file) {
  const text = readFileSync(`${WORKFLOWS}/${file}`, 'utf8');
  const after = text.split(/^jobs:\s*$/mu)[1] ?? '';
  return [...after.matchAll(/^ {2}([A-Za-z0-9_-]+):[ \t]*$/gmu)].map((m) => m[1]);
}

const workflowFiles = readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'));
const claimed = new Set(GATES.flatMap((g) => g.ci.map((c) => `${c.workflow}:${c.job}`)));

test('every job in every workflow is claimed by a registry entry', () => {
  const missing = [];
  for (const file of workflowFiles) {
    for (const job of jobsOf(file))
      if (!claimed.has(`${file}:${job}`)) missing.push(`${file}:${job}`);
  }
  assert.deepEqual(
    missing,
    [],
    'add these CI jobs to tools/gates/registry.mjs with their local enforcement or auto-fix',
  );
});

test('every claimed job and step exists in its workflow', () => {
  for (const gate of GATES) {
    for (const { workflow, job, step } of gate.ci) {
      assert.ok(workflowFiles.includes(workflow), `${gate.id}: no workflow ${workflow}`);
      assert.ok(jobsOf(workflow).includes(job), `${gate.id}: ${workflow} has no job ${job}`);
      if (step)
        assert.ok(
          read(`.github/workflows/${workflow}`).includes(`name: ${step}`),
          `${gate.id}: no step "${step}"`,
        );
    }
  }
});

test('every blocking step of the ci.yml policy job has its own entry', () => {
  const text = read('.github/workflows/ci.yml');
  const policy = text.slice(
    text.indexOf('\n  policy:'),
    text.indexOf('\n  secrets:') > 0 ? text.indexOf('\n  # gitleaks over every commit') : undefined,
  );
  const steps = [...policy.matchAll(/^ {6}- name: (.+)$/gmu)].map((m) => m[1].trim());
  assert.ok(steps.length >= 5);
  const claimedSteps = new Set(
    GATES.flatMap((g) => g.ci.filter((c) => c.job === 'policy').map((c) => c.step)),
  );
  for (const step of steps)
    assert.ok(claimedSteps.has(step), `policy step "${step}" has no registry entry`);
});

test('every entry has a local enforcement point or an explicit CI-only reason, and a fix or a human reason', () => {
  const ids = new Set();
  for (const gate of GATES) {
    assert.ok(!ids.has(gate.id), `duplicate id ${gate.id}`);
    ids.add(gate.id);
    assert.ok(gate.what.length > 10, `${gate.id}: describe what it checks`);
    assert.ok(
      ['no', 'yes-fixed-automatically', 'yes-needs-judgment', 'external-state'].includes(
        gate.failable,
      ),
      gate.id,
    );
    if (gate.local.point === 'ci-only') {
      assert.ok(gate.local.reason.length > 15, `${gate.id}: ci-only needs a real reason`);
    } else {
      assert.ok(['pre-commit', 'commit-msg', 'pre-push'].includes(gate.local.point), gate.id);
      assert.ok(
        existsSync(repoPath(gate.local.via)),
        `${gate.id}: ${gate.local.via} does not exist`,
      );
      assert.ok(
        read(gate.local.via).includes(gate.local.invokes),
        `${gate.id}: ${gate.local.via} no longer contains "${gate.local.invokes}"`,
      );
    }
    if (gate.autofix.kind !== 'auto')
      assert.ok((gate.human ?? '').length > 10, `${gate.id}: needs a reason a human must decide`);
    if (gate.autofix.kind === 'auto') assert.ok(gate.autofix.how.length > 10, gate.id);
    if (gate.failable === 'yes-fixed-automatically')
      assert.equal(gate.autofix.kind, 'auto', gate.id);
  }
});

test('the hooks call the auto-fix tools the registry relies on', () => {
  const preCommit = read('.husky/pre-commit');
  assert.match(preCommit, /node tools\/gates\/autosync\.mjs \|\| exit 1/u);
  assert.match(read('tools/gates/pre-push.mjs'), /healGenerated\(\)/u);
  assert.match(read('tools/gates/pre-push.mjs'), /healDependencies\(\)/u);
  assert.match(read('tools/gates/autosync.mjs'), /audit-fix\.mjs/u);
});

test('lint-staged keeps eslint and prettier in ONE glob (they must never run concurrently)', () => {
  const config = read('.lintstagedrc.cjs');
  const globs = [...config.matchAll(/^\s{2}'([^']+)':/gmu)];
  assert.equal(
    globs.length,
    1,
    'a second glob would run eslint --fix and prettier --write concurrently',
  );
});

test('release depends on ci-success only, never on the advisory policy job', () => {
  const ci = read('.github/workflows/ci.yml');
  const needs = /ci-success:[\s\S]*?needs:\s*\[([\s\S]*?)\]/u.exec(ci)?.[1] ?? '';
  assert.ok(!/\bpolicy\b/u.test(needs), 'policy is advisory and must stay out of ci-success');
  assert.match(ci, /policy:[\s\S]{0,200}continue-on-error: true/u);
});
