import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CATALOG_PATH,
  LIGHTHOUSE_PLAN_CATALOG,
  createCatalogServer,
} from '../../apps/claw-frontend/scripts/lighthouse-pricing-fixture.mjs';

// The Lighthouse job has no backend. Without this fixture /en and
// /en/pricing audited the "pricing unavailable" state, and the 503 in the
// console kept the gate red on main (best-practices 0.96).
const WORKFLOW = join(import.meta.dirname, '..', '..', '.github', 'workflows', 'lighthouse.yml');

async function withServer(run) {
  const server = createCatalogServer('token');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${String(port)}`);
  } finally {
    server.close();
  }
}

test('the fixture answers like auth-service: service token required', async () => {
  await withServer(async (origin) => {
    assert.equal((await fetch(`${origin}${CATALOG_PATH}`)).status, 401);
    const ok = await fetch(`${origin}${CATALOG_PATH}`, { headers: { authorization: 'Service token' } });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).length, LIGHTHOUSE_PLAN_CATALOG.length);
  });
});

test('every fixture plan has the fields the pricing page renders', () => {
  const required = ['id', 'slug', 'name', 'displayOrder', 'isDefault', 'isPopular', 'prices', 'features'];
  for (const plan of LIGHTHOUSE_PLAN_CATALOG) {
    for (const field of required) {
      assert.ok(field in plan, `${plan.id} lacks ${field}`);
    }
    assert.ok(plan.prices.some((price) => price.billingInterval === 'MONTHLY'), `${plan.id} has no monthly price`);
    assert.match(plan.description, /Lighthouse fixture/u, 'fixture data must say it is fixture data');
  }
});

test('the Lighthouse workflow starts the fixture and points the frontend at it', () => {
  const workflow = readFileSync(WORKFLOW, 'utf8');
  assert.match(workflow, /scripts\/lighthouse-pricing-fixture\.mjs/u);
  assert.match(workflow, /AUTH_SERVICE_URL: http:\/\/127\.0\.0\.1:4901/u);
  assert.match(workflow, /INTER_SERVICE_AUTH_TOKEN: lighthouse-fixture/u);
});
