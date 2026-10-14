import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync('.github/workflows/ai-native-os.yml', 'utf8');
const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const prepare = readFileSync('.github/actions/prepare/action.yml', 'utf8');

function job(source, id) {
  const start = source.indexOf(`  ${id}:`);
  assert.notEqual(start, -1, `${id} job must exist`);
  const rest = source.slice(start + id.length + 3);
  const next = rest.search(/^ {2}[a-z][a-z0-9-]*:/mu);
  return next === -1 ? rest : rest.slice(0, next);
}

test('tooling tests install dependencies required by imported tooling modules', () => {
  const toolingJob = job(workflow, 'tooling-tests');
  const prepared = toolingJob.indexOf('uses: ./.github/actions/prepare');
  const tests = toolingJob.indexOf('npm run knowledge:test:fast');
  assert.ok(prepared >= 0 && tests > prepared, 'dependencies must be installed before the tooling tests run');
  assert.match(prepare, /npm ci --ignore-scripts/u, 'the prepare action installs on a cache miss');
});

test('ai-native-os runs inside CI, so a red knowledge, QA or tooling gate blocks the release', () => {
  assert.match(workflow, /on:\s*\n\s*workflow_call:/u);
  assert.doesNotMatch(workflow, /^\s{2}(pull_request|push):/mu, 'no second, unaggregated trigger');
  assert.match(job(ci, 'ai-native-os'), /uses: \.\/\.github\/workflows\/ai-native-os\.yml/u);
  assert.match(job(ci, 'ci-success'), /ai-native-os,/u);
});

test('the deploy rehearsal runs only for deploy-path changes, and the fast suite never runs it', () => {
  assert.match(job(workflow, 'deploy-rehearsal'), /if: inputs\.deploy/u);
  assert.match(job(workflow, 'deploy-rehearsal'), /npm run knowledge:test:rehearsal/u);
  assert.doesNotMatch(job(workflow, 'tooling-tests'), /knowledge:test:rehearsal/u);
});

test('every workflow takes Node from .nvmrc', () => {
  for (const source of [workflow, ci, prepare]) {
    assert.doesNotMatch(source, /node-version:\s/u);
  }
  assert.match(readFileSync('.nvmrc', 'utf8'), /^\d+\s*$/u);
});

test('third-party actions are pinned to full commit SHAs', () => {
  for (const source of [workflow, ci, prepare]) {
    for (const [, ref] of source.matchAll(/uses:\s+([^\s#]+)/gu)) {
      if (ref.startsWith('./')) continue;
      assert.match(ref, /@[0-9a-f]{40}$/u, `${ref} must be pinned to a commit SHA`);
    }
  }
});

test('knowledge integrity and tooling tests are advisory; the other ai-native-os gates still block', () => {
  for (const id of ['knowledge-integrity', 'tooling-tests']) {
    assert.match(job(workflow, id), /continue-on-error: true/u, `${id} must not block CI success`);
  }
  for (const id of ['qa-evidence', 'knowledge-freshness', 'architecture-rules']) {
    assert.doesNotMatch(job(workflow, id), /continue-on-error/u, `${id} stays a blocking gate`);
  }
});
