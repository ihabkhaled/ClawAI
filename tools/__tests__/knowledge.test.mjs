// Tests for the knowledge compiler + context resolver. `node --test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildManifests } from '../lib/manifests.mjs';
import { computeGeneratedFiles } from '../knowledge/build.mjs';
import { resolveContext } from '../knowledge/context.mjs';
import { classifyTask } from '../knowledge/classify-task.mjs';
import { hash } from '../lib/fact.mjs';

test('manifests include the core derivable set', () => {
  const m = buildManifests();
  for (const key of [
    'repository',
    'services',
    'packages',
    'api-endpoints',
    'rabbitmq-events',
    'permissions',
    'environment-variables',
    'ports',
    'nginx-routes',
    'docker-services',
    'frontend-routes',
    'event-graph',
    'workspace-dependency-graph',
  ]) {
    assert.ok(key in m, `missing manifest ${key}`);
  }
});

test('event graph infers message.created chat→routing', () => {
  const m = buildManifests();
  const evt = m['event-graph'].events.find((e) => e.pattern === 'message.created');
  assert.ok(evt, 'message.created present');
  assert.ok(evt.producers.includes('claw-chat-service'), 'chat produces it');
  assert.ok(evt.consumers.includes('claw-routing-service'), 'routing consumes it');
});

test('generated .ai file set is deterministic (byte-identical)', () => {
  const a = computeGeneratedFiles();
  const b = computeGeneratedFiles();
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  assert.deepEqual(keysA, keysB);
  for (const k of keysA) assert.equal(hash(a[k]), hash(b[k]), `drift in ${k}`);
});

test('BOOTSTRAP.md is generated and within a compact budget', () => {
  const files = computeGeneratedFiles();
  const boot = files['.ai/BOOTSTRAP.md'];
  assert.ok(boot, 'bootstrap generated');
  assert.ok(boot.includes('knowledge:context'), 'points to context resolver');
  // ~4 chars/token; keep under ~1800 tokens (7200 chars) as a guard.
  assert.ok(boot.length < 7200, `bootstrap too large: ${boot.length} chars`);
});

test('every workspace gets a generated AGENTS.md', () => {
  const files = computeGeneratedFiles();
  const agentsFiles = Object.keys(files).filter((f) => f.endsWith('/AGENTS.md'));
  assert.ok(agentsFiles.length >= 20, `expected many workspace AGENTS.md, got ${agentsFiles.length}`);
});

test('task classifier routes known task shapes to the right pack', () => {
  assert.equal(classifyTask('add refresh token rotation to auth').pack, 'authentication-security');
  assert.equal(classifyTask('fix chat streaming sse deltas').pack, 'chat-streaming');
  assert.equal(classifyTask('add a new rabbitmq event for connectors').pack, 'rabbitmq-event');
  assert.equal(classifyTask('change prisma schema and migration').pack, 'database-migration');
  assert.equal(classifyTask('build a new react component page').pack, 'frontend-feature');
  // Unmatched → safe default.
  assert.equal(classifyTask('do something vague').pack, 'backend-feature');
});

test('resolveContext returns a structured, budget-bounded bundle', () => {
  const ctx = resolveContext({ task: 'add refresh-token session rotation', service: 'auth', maxTokens: 6000 });
  assert.equal(ctx.classification.pack, 'authentication-security');
  assert.ok(ctx.affectedWorkspaces.some((w) => w.name === 'claw-auth-service'));
  assert.ok(ctx.governingRules.length > 0);
  assert.ok(Array.isArray(ctx.recommendedReviewers) && ctx.recommendedReviewers.length > 0);
  assert.equal(ctx.budget.maxTokens, 6000);
});

test('resolveContext flags missing info for an unscoped, empty task', () => {
  const ctx = resolveContext({ task: '', maxTokens: 6000 });
  assert.ok(ctx.missingInformation.length > 0);
});
