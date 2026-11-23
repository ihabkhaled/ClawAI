#!/usr/bin/env node
// ADR-161 live proof for a PICKED model (MANUAL_MODEL): with the free credit
// allowance used up, FALLBACK answers from an included substitute that routing
// named, and STOP ends on the credit refusal with no substitute call.
//
// Local dev stack only. Creates a throw-away Free user (random password, never
// printed), marks its monthly free allowance used up in the local auth DB
// (docker exec, local container), runs one turn per mode and bans the user.
//   NODE_EXTRA_CA_CERTS=certs/rootCA.pem node --env-file=.env scripts/qa/live-credit-fallback-manual-pick.mjs
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
if (!BASE.includes('claw.local')) throw new Error('local dev stack only');
const PICK = {
  provider: process.env.QA_PICK_PROVIDER ?? 'GEMINI',
  model: process.env.QA_PICK_MODEL ?? 'gemini-2.5-flash',
};
// Providers the meter exempts (ADR-161 "included"): a fallback answer must come from one.
const INCLUDED = new Set(['OLLAMA', 'LLAMACPP', 'LOCAL_OLLAMA']);
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sql = (statement) =>
  execFileSync('docker', [
    'exec',
    'claw-pg-auth',
    'sh',
    '-c',
    `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "${statement}"`,
  ])
    .toString()
    .trim();

async function newestAssistant(token, threadId) {
  for (let i = 0; i < 60; i += 1) {
    await sleep(2000);
    const page = await call(token, 'GET', `/chat-messages/thread/${threadId}?limit=5`);
    const top = (page.data?.data ?? [])[0];
    if (top?.role === 'ASSISTANT' && top.status !== 'STREAMING' && top.status !== 'PENDING') {
      return top;
    }
  }
  return null;
}

async function turn(token, mode) {
  const pref = await call(token, 'PATCH', '/users/me/preferences', { creditFallbackMode: mode });
  check(`mode set to ${mode}`, pref.status === 200, `got ${pref.status}`);
  const thread = await call(token, 'POST', '/chat-threads', {
    title: `qa credit ${mode}`,
    routingMode: 'MANUAL_MODEL',
    preferredProvider: PICK.provider,
    preferredModel: PICK.model,
  });
  const threadId = thread.data?.id;
  await call(token, 'POST', '/chat-messages', {
    threadId,
    content: 'Say hello in five words.',
    routingMode: 'MANUAL_MODEL',
    provider: PICK.provider,
    model: PICK.model,
  });
  const answer = await newestAssistant(token, threadId);
  const meta = answer?.metadata ?? {};
  console.log(
    `  ${mode}: provider=${answer?.provider} model=${answer?.model} status=${answer?.status} ` +
      `errorCode=${meta.errorCode ?? answer?.errorCode ?? ''} creditFallback=${JSON.stringify(meta.creditFallback ?? null)}`,
  );
  return { answer, meta };
}

const admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const suffix = randomBytes(4).toString('hex');
const email = `qa-fallback-${suffix}@claw.local`;
const password = `Qa-${randomBytes(12).toString('base64url')}9a!`;
const created = await call(admin, 'POST', '/users', {
  email,
  username: `qa_fallback_${suffix}`,
  password,
});
const userId = created.data?.id;
try {
  const token = await login(email, password);
  const period = new Date().toISOString().slice(0, 7);
  sql(
    `insert into credit_free_allowance_usage (id, user_id, provider, period_key, used_count, updated_at) ` +
      `values ('qa-${suffix}', '${userId}', '*', '${period}', 9999, now()) ` +
      `on conflict (user_id, provider, period_key) do update set used_count = 9999`,
  );

  const fallback = await turn(token, 'FALLBACK');
  check(
    'FALLBACK: an included substitute answered the picked model',
    INCLUDED.has(String(fallback.answer?.provider).toUpperCase()) &&
      fallback.answer?.status !== 'FAILED',
    `provider ${fallback.answer?.provider}`,
  );
  check(
    'FALLBACK: the answer carries the credit notice',
    fallback.meta.creditFallback !== undefined && fallback.meta.creditFallback !== null,
    JSON.stringify(fallback.meta.creditFallback ?? null),
  );

  const stop = await turn(token, 'STOP');
  check(
    'STOP: no substitute answered',
    !INCLUDED.has(String(stop.answer?.provider).toUpperCase()),
    `provider ${stop.answer?.provider}`,
  );
  check(
    'STOP: the turn ends on the credit refusal',
    /PAYG_|CREDIT|ALLOWANCE/u.test(
      String(stop.meta.errorCode ?? stop.answer?.errorCode ?? stop.answer?.content ?? ''),
    ),
    String(stop.meta.errorCode ?? stop.answer?.errorCode ?? ''),
  );
} finally {
  if (userId) {
    await call(admin, 'POST', `/users/${userId}/ban`, {
      reason: 'QA account, fallback proof finished',
    });
  }
}
const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
