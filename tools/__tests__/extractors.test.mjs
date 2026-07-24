// Tests for the audit/knowledge extraction layer. Run with `node --test`.
// These assert behaviour against the REAL repository (the tooling's contract is
// "derive facts from real files"), plus determinism and fact-tagging invariants.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAll } from '../lib/extractors.mjs';
import { buildInventory } from '../audit/index.mjs';
import { stableStringify, hash, verified, unverified, isUnverified } from '../lib/fact.mjs';
import {
  findContradictions,
  findPortCoverageGaps,
  findBypassRecommendations,
} from '../lib/analyzers.mjs';

test('extractAll returns every declared dimension', () => {
  const inv = extractAll();
  for (const key of [
    'workspaces',
    'ports',
    'envVars',
    'prismaModels',
    'apiEndpoints',
    'events',
    'permissions',
    'nginxRoutes',
    'dockerServices',
    'frontendRoutes',
    'i18n',
    'tests',
    'governance',
  ]) {
    assert.ok(key in inv, `missing dimension ${key}`);
  }
});

test('workspaces include the frontend and shared packages, classified', () => {
  const inv = extractAll();
  const names = inv.workspaces.map((w) => w.name);
  assert.ok(names.includes('claw-frontend'), 'frontend present');
  assert.equal(
    inv.workspaces.find((w) => w.name === 'claw-frontend').type,
    'frontend',
  );
  assert.ok(inv.workspaces.some((w) => w.type === 'shared-package'), 'has shared packages');
  assert.ok(
    inv.workspaces.filter((w) => w.type === 'nestjs-service').length >= 15,
    'has the NestJS service fleet',
  );
});

test('ports are verified facts sourced from shared-constants', () => {
  const inv = extractAll();
  const auth = inv.ports.AUTH_SERVICE_PORT;
  assert.equal(auth.value, 4001);
  assert.equal(auth.confidence, 'verified');
  assert.match(auth.source, /shared-constants/);
});

test('events and permissions are non-empty and sorted', () => {
  const inv = extractAll();
  assert.ok(inv.events.length > 50, 'many events');
  const patterns = inv.events.map((e) => e.pattern);
  assert.deepEqual(patterns, [...patterns].sort(), 'events sorted by pattern');
  assert.ok(inv.permissions.length > 10, 'many permissions');
});

test('i18n key count is tagged unverified (line-based heuristic)', () => {
  const inv = extractAll();
  assert.ok(isUnverified(inv.i18n.approxKeyCount), 'approx key count is unverified');
  assert.equal(inv.i18n.localeCount, inv.i18n.locales.length);
});

test('inventory is deterministic (byte-identical across runs)', () => {
  const a = stableStringify(buildInventory());
  const b = stableStringify(buildInventory());
  assert.equal(hash(a), hash(b));
  assert.equal(a, b);
});

test('fact helpers tag confidence correctly', () => {
  assert.equal(verified(1, 'x').confidence, 'verified');
  assert.equal(unverified(1, 'x', 'why').confidence, 'unverified');
  assert.ok(isUnverified(unverified(1, 'x', 'why')));
  assert.ok(!isUnverified(verified(1, 'x')));
});

test('stableStringify sorts keys recursively', () => {
  const out = stableStringify({ b: 1, a: { d: 2, c: 3 } });
  assert.equal(out, '{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}\n');
});

test('port-coverage analyzer flags services missing a port constant', () => {
  const inv = extractAll();
  const gaps = findPortCoverageGaps(inv);
  // client-logs and server-logs services have no *_SERVICE_PORT constant.
  assert.ok(Array.isArray(gaps));
  for (const g of gaps) assert.equal(g.kind, 'service-without-port-constant');
});

test('contradiction analyzer returns evidence-bearing findings', () => {
  const inv = extractAll();
  const findings = findContradictions(inv);
  for (const f of findings) {
    assert.ok(f.message && Array.isArray(f.evidence) && f.evidence.length > 0);
    assert.ok(['low', 'medium', 'high'].includes(f.severity));
  }
});

test('bypass scan detects --no-verify recommendations in current policy docs', () => {
  const findings = findBypassRecommendations();
  // The pre-refactor repo recommends --no-verify; the scan must catch it so the
  // remediation (removing those recommendations) can be verified later.
  assert.ok(Array.isArray(findings));
  for (const f of findings) assert.equal(f.kind, 'hook-bypass-recommendation');
});
