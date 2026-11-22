#!/usr/bin/env node
// Publishes a new Live Intelligence policy version that sets one plan's allowance,
// through the admin API (versioned, auditable, ADR-221). Also proves an invalid
// config is refused.
//
//   LIVE_PLAN=admin LIVE_FREE_SECONDS=36000 node --env-file=.env scripts/qa/live-policy-set-plan.mjs
import { readFileSync } from 'node:fs';
import { Agent, setGlobalDispatcher } from 'undici';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const PLAN = process.env.LIVE_PLAN;
const FREE_SECONDS = Number(process.env.LIVE_FREE_SECONDS);
const PRICE = Number(process.env.LIVE_PRICE_MICRO_USD_PER_MINUTE ?? 20000);
if (!PLAN || !Number.isInteger(FREE_SECONDS)) {
  console.error('Set LIVE_PLAN and LIVE_FREE_SECONDS.');
  process.exit(2);
}
try {
  setGlobalDispatcher(new Agent({ connect: { ca: readFileSync('certs/rootCA.pem') } }));
} catch {
  // system trust store
}

const login = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  signal: AbortSignal.timeout(15_000),
});
if (!login.ok) throw new Error(`login failed ${login.status}`);
const headers = {
  Authorization: `Bearer ${(await login.json()).tokens.accessToken}`,
  'Content-Type': 'application/json',
};
const current = await (await fetch(`${BASE}/live/admin/policy`, { headers })).json();
const config = structuredClone(current.active.config);
config.plans[PLAN] = { freeSecondsPerMonth: FREE_SECONDS, paidMicroUsdPerMinute: PRICE };

const put = await fetch(`${BASE}/live/admin/policy`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ config, note: `set ${PLAN} allowance` }),
  signal: AbortSignal.timeout(15_000),
});
const saved = await put.json();
console.log(`PUT ${put.status} version=${saved.version ?? '?'}`);

const invalid = await fetch(`${BASE}/live/admin/policy`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ config: { ...config, graceSeconds: -5 } }),
  signal: AbortSignal.timeout(15_000),
});
console.log(`PUT invalid config -> ${invalid.status}`);
process.exit(put.ok && invalid.status === 400 ? 0 : 1);
