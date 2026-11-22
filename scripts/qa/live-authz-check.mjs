#!/usr/bin/env node
// Live Intelligence (ADR-221) authorization check: a FREE user cannot reach admin
// routes or another user's history/session/stream (IDOR). Creates a throw-away
// QA user (random password, never printed) and bans it afterwards.
//   NODE_EXTRA_CA_CERTS=certs/rootCA.pem node --env-file=.env scripts/qa/live-authz-check.mjs
import { randomBytes } from 'node:crypto';
const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${detail})`);
};
const call = async (token, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const login = async (email, password) =>
  (await call(null, 'POST', '/auth/login', { email, password })).data.tokens.accessToken;
const admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const password = `Qa-${randomBytes(12).toString('base64url')}9a!`;
async function makeUser(tag) {
  const suffix = randomBytes(4).toString('hex');
  const email = `qa-${tag}-${suffix}@claw.local`;
  const created = await call(admin, 'POST', '/users', {
    email,
    username: `qa_${tag}_${suffix}`,
    password,
  });
  return { id: created.data?.id, token: await login(email, password) };
}
const owner = await makeUser('owner');
const attacker = await makeUser('authz');
const userIds = [owner.id, attacker.id];
try {
  const user = attacker.token;
  // The owner's session, probed by another FREE user.
  const own = await call(owner.token, 'POST', '/live/sessions', {
    url: 'fixture:live-demo',
    language: 'en',
    mode: 'AUDIO',
  });
  check('owner session created', Boolean(own.data?.sessionId), `got ${own.status}`);
  const sid = own.data.sessionId;
  for (const [method, path, body] of [
    ['GET', '/live/admin/overview?days=1'],
    ['GET', '/live/admin/policy'],
    ['PUT', '/live/admin/policy', { config: {} }],
    ['POST', `/live/admin/runs/${own.data.runId}/stop`],
  ]) {
    const res = await call(user, method, path, body);
    check(
      `FREE user refused ${method} ${path.split('?')[0]}`,
      res.status === 403,
      `got ${res.status}`,
    );
  }
  for (const [method, path, body] of [
    ['GET', `/live/history/${sid}/events`],
    ['POST', `/live/sessions/${sid}/heartbeat`, { state: 'PLAYING', playbackAt: Date.now() }],
    ['POST', `/live/history/${sid}/export`, { format: 'TXT' }],
    ['DELETE', `/live/sessions/${sid}`],
    ['DELETE', `/live/history/${sid}`],
    ['GET', `${own.data.playbackUrl.replace('/api/v1', '')}`],
  ]) {
    const res = await call(user, method, path, body);
    check(
      `IDOR blocked: ${method} ${path.replace(sid, ':id').replace(own.data.streamId, ':stream')}`,
      res.status === 404 || res.status === 403,
      `got ${res.status}`,
    );
  }
  const sse = await fetch(`${BASE}/live/sessions/${sid}/stream`, {
    headers: { Authorization: `Bearer ${user}` },
  });
  check(
    'IDOR blocked: SSE of another user',
    sse.status === 404 || sse.status === 403,
    `got ${sse.status}`,
  );
  await sse.body?.cancel();
  const history = await call(user, 'GET', '/live/history');
  check(
    "FREE user's history does not list another user's session",
    !(history.data?.items ?? []).some((i) => (i.id ?? i.sessionId) === sid),
    `${history.data?.items?.length ?? 0} items`,
  );
  await call(owner.token, 'DELETE', `/live/sessions/${sid}`);
} finally {
  for (const id of userIds)
    if (id)
      await call(admin, 'POST', `/users/${id}/ban`, { reason: 'QA account, authz check finished' });
}
const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
