#!/usr/bin/env node
// Live Intelligence (ADR-221) bounded concurrency check: N viewers join the same
// fixture stream at the same instant. All must land on ONE processing run.
// Temporarily raises the per-user session limits through a new policy version,
// then restores the previous config as another version (history stays immutable).
//
//   LIVE_QA_VIEWERS=25 NODE_EXTRA_CA_CERTS=certs/rootCA.pem node --env-file=.env scripts/qa/live-shared-run-load.mjs
const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const VIEWERS = Number(process.env.LIVE_QA_VIEWERS ?? 25);

const login = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
const token = (await login.json()).tokens.accessToken;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const api = (method, path, body) =>
  fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }).then(
    async (res) => ({ status: res.status, data: await res.json().catch(() => null) }),
  );

const before = (await api('GET', '/live/admin/policy')).data.active;
const raised = structuredClone(before.config);
raised.maxSessionsPerUser = VIEWERS + 5;
raised.sessionsPerUserPerHour = VIEWERS * 4;
await api('PUT', '/live/admin/policy', {
  config: raised,
  note: 'load test: raise per-user limits',
});
await new Promise((resolve) => setTimeout(resolve, 11_000)); // policy cache is 10 s

let exitCode = 1;
const sessions = [];
try {
  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: VIEWERS }, async () => {
      const t0 = Date.now();
      const res = await api('POST', '/live/sessions', {
        url: 'fixture:live-demo',
        language: 'en',
        mode: 'AUDIO',
      });
      return { ...res, ms: Date.now() - t0 };
    }),
  );
  const wall = Date.now() - started;
  for (const r of results) if (r.data?.sessionId) sessions.push(r.data.sessionId);
  const created = results.filter((r) => r.status < 300);
  const runIds = new Set(created.map((r) => r.data.runId));
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95) - 1] ?? latencies.at(-1);
  console.log(
    `viewers=${VIEWERS} created=${created.length} distinctRuns=${runIds.size} wall=${wall}ms p50=${latencies[Math.floor(latencies.length / 2)]}ms p95=${p95}ms`,
  );
  const statuses = results.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {},
  );
  console.log(`statuses ${JSON.stringify(statuses)}`);
  exitCode = created.length === VIEWERS && runIds.size === 1 ? 0 : 1;
  console.log(
    exitCode === 0
      ? 'PASS  every viewer shares one run'
      : 'FAIL  viewers did not converge on one run',
  );
} finally {
  await Promise.all(sessions.map((id) => api('DELETE', `/live/sessions/${id}`)));
  await api('PUT', '/live/admin/policy', {
    config: before.config,
    note: 'load test: restore limits',
  });
}
process.exit(exitCode);
