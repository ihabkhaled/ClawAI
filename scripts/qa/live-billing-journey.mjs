#!/usr/bin/env node
// Live Intelligence (ADR-221) billing journey on a real stack, end to end:
// free minutes -> credits required -> approve with no credit -> 60 s grace ->
// exhausted -> reconnect cannot reset grace -> admin top-up -> paid minute
// charged at the policy price through auth-service's fixed-price PAYG path.
//
// Creates a throw-away QA user (random password, never printed) and shrinks the
// FREE plan to 60 free seconds through a new policy version; restores it after.
//
//   NODE_EXTRA_CA_CERTS=certs/rootCA.pem node --env-file=.env scripts/qa/live-billing-journey.mjs
import { randomBytes } from 'node:crypto';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

async function call(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}
async function login(email, password) {
  const res = await call(null, 'POST', '/auth/login', { email, password });
  if (res.status >= 300) throw new Error(`login failed ${res.status}`);
  return res.data.tokens.accessToken;
}

const admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const suffix = randomBytes(4).toString('hex');
const password = `Qa-${randomBytes(12).toString('base64url')}9a!`;
const email = `qa-live-${suffix}@claw.local`;
const created = await call(admin, 'POST', '/users', {
  email,
  username: `qa_live_${suffix}`,
  password,
});
check('QA user created by admin', created.status < 300, `status ${created.status}`);
const userId = created.data?.id;

const before = (await call(admin, 'GET', '/live/admin/policy')).data.active;
const tight = structuredClone(before.config);
tight.plans.free = { freeSecondsPerMonth: 60, paidMicroUsdPerMinute: 20000 };
await call(admin, 'PUT', '/live/admin/policy', {
  config: tight,
  note: 'billing journey: free plan 60 s',
});
await wait(11_000);

let sessionId = null;
try {
  const user = await login(email, password);
  const usage0 = await call(user, 'GET', '/live/usage');
  check(
    'new free user sees 60 free seconds',
    usage0.data?.freeSecondsTotal === 60,
    JSON.stringify(usage0.data),
  );

  const session = await call(user, 'POST', '/live/sessions', {
    url: 'fixture:live-demo',
    language: 'en',
    mode: 'AUDIO',
  });
  sessionId = session.data?.sessionId;
  check(
    'session starts ACTIVE on free seconds',
    session.data?.state === 'ACTIVE',
    session.data?.state,
  );

  const beat = () =>
    call(user, 'POST', `/live/sessions/${sessionId}/heartbeat`, {
      state: 'PLAYING',
      playbackAt: Date.now(),
      atLiveEdge: true,
    });
  let view = null;
  for (let i = 0; i < 13; i += 1) {
    view = await beat();
    if (view.data?.state === 'CREDITS_REQUIRED') break;
    await wait(10_000);
  }
  check(
    'free minute used, then CREDITS_REQUIRED (no auto-spend)',
    view.data?.state === 'CREDITS_REQUIRED',
    `${view.data?.state} billed=${view.data?.usage?.billedSeconds}`,
  );

  const approve = await call(user, 'POST', `/live/sessions/${sessionId}/approve-credits`, {
    spendingCapMicroUsd: 100000,
  });
  check('credits approved with a spending cap', approve.status < 300, `status ${approve.status}`);
  for (let i = 0; i < 9; i += 1) {
    view = await beat();
    if (view.data?.state === 'GRACE') break;
    await wait(10_000);
  }
  check('no credit -> one 60 s GRACE', view.data?.state === 'GRACE', view.data?.state);

  // Reconnect during grace: a new session must not get a fresh grace.
  await call(user, 'DELETE', `/live/sessions/${sessionId}`);
  const again = await call(user, 'POST', '/live/sessions', {
    url: 'fixture:live-demo',
    language: 'en',
    mode: 'AUDIO',
  });
  sessionId = again.data?.sessionId;
  await call(user, 'POST', `/live/sessions/${sessionId}/approve-credits`, {});
  for (let i = 0; i < 12; i += 1) {
    view = await beat();
    if (view.data?.state === 'EXHAUSTED') break;
    await wait(10_000);
  }
  check(
    'grace expires to EXHAUSTED; reconnect did not reset it',
    view.data?.state === 'EXHAUSTED',
    view.data?.state,
  );

  // Top-up, then a paid minute is charged at the policy price.
  const topup = await call(admin, 'POST', `/admin/credit/wallets/${userId}/adjust`, {
    amountMicroUsd: 100000,
    reason: 'Live Intelligence billing journey QA top-up',
  });
  check('admin top-up', topup.status < 300, `status ${topup.status}`);
  await call(user, 'POST', `/live/sessions/${sessionId}/approve-credits`, {
    spendingCapMicroUsd: 100000,
  });
  let paid = null;
  for (let i = 0; i < 9; i += 1) {
    view = await beat();
    paid = view.data?.usage;
    if ((paid?.spentMicroUsd ?? 0) > 0) break;
    await wait(10_000);
  }
  check(
    'paid minute charged at $0.02 (20,000 micro-USD)',
    paid?.spentMicroUsd === 20000,
    JSON.stringify(paid),
  );
} finally {
  if (sessionId) await call(null, 'GET', '/health').catch(() => null);
  await call(admin, 'PUT', '/live/admin/policy', {
    config: before.config,
    note: 'billing journey: restore',
  });
  if (userId)
    await call(admin, 'POST', `/users/${userId}/ban`, { reason: 'QA account, journey finished' });
}
const failed = results.filter((ok) => !ok).length;
console.log(
  `\n${results.length - failed}/${results.length} passed${userId ? ` (QA user ${userId})` : ''}`,
);
process.exit(failed === 0 ? 0 : 1);
