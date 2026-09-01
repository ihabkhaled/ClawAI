// ClawAI conversational-context QA lab — HTTP client.
// Hard rule: only PAYG-exempt (OLLAMA/LLAMACPP) models may ever execute.
import fs from 'node:fs';
import path from 'node:path';

// Never hard-code these. A QA credential committed to the repository is a
// credential published to everyone who can read the repository, and rotating it
// then means rotating it everywhere. Export them in your shell:
//
//   export QA_LAB_BASE=https://claw-ai.co/api/v1
//   export QA_LAB_EMAIL=testing@claw-ai.co
//   export QA_LAB_PASSWORD='…'
export const BASE = process.env.QA_LAB_BASE ?? 'https://claw-ai.co/api/v1';
export const EMAIL = process.env.QA_LAB_EMAIL ?? '';
export const PASSWORD = process.env.QA_LAB_PASSWORD ?? '';

// QA_ALLOW_METERED_MODELS=false — enforced in code, not by naming convention.
export const ALLOW_METERED = false;

let token = null;
let tokenAt = 0;

// Whoever the process is currently acting as. Kept separate from EMAIL /
// PASSWORD so the silent token refresh below renews the ACTIVE identity rather
// than snapping back to the lab account mid-run.
let activeEmail = EMAIL;
let activePassword = PASSWORD;

export async function login() {
  if (activeEmail.length === 0 || activePassword.length === 0) {
    throw new Error(
      'QA_LAB_EMAIL and QA_LAB_PASSWORD must be set. See skills/audit-conversational-context.md.',
    );
  }
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: activeEmail, password: activePassword }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status} ${await res.text()}`);
  const body = await res.json();
  token = body.tokens.accessToken;
  tokenAt = Date.now();
  return body.user;
}

/**
 * Act as a different user for every subsequent call.
 *
 * Memories are USER-scoped and are injected into every thread that user owns,
 * so an account that has accumulated fixtures from earlier runs quietly
 * contaminates later ones: a stored "the internal project codename is ORCHID-…"
 * competes with the codename the scenario seeds in the thread, and the model
 * picks one. Measured on the shared lab account — three recall probes at
 * distances 4, 24 and 56 all failed at exactly the same rate, which is the
 * signature of a constant competing fact rather than of context loss.
 *
 * A long run therefore belongs on its own fresh account, where the only thing
 * in scope is the conversation being measured.
 */
export async function loginAs(email, password) {
  activeEmail = email;
  activePassword = password;
  token = null;
  tokenAt = 0;
  return login();
}

/** Mint a brand-new empty account (admin credentials required). */
export async function createIsolatedUser(tag) {
  const suffix = `${tag}${Date.now().toString(36)}`;
  const account = {
    email: `qa-${suffix}@claw.local`,
    username: `qa${suffix}`.replace(/[^a-z0-9]/gi, '').slice(0, 28),
    password: 'QaIsolated123!',
    firstName: 'QA',
    lastName: 'Isolated',
  };
  await login();
  const created = await api('POST', '/users', account);
  if (!created.ok) {
    throw new Error(`createIsolatedUser failed ${created.status} ${JSON.stringify(created.body)}`);
  }
  const user = await loginAs(account.email, account.password);
  return { ...account, id: user.id };
}

async function ensureToken() {
  // access token lives 900s; refresh well before the edge
  if (token === null || Date.now() - tokenAt > 600_000) await login();
  return token;
}

export async function api(method, pathname, body, { retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const bearer = await ensureToken();
    let res;
    try {
      res = await fetch(`${BASE}${pathname}`, {
        method,
        headers: {
          Authorization: `Bearer ${bearer}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (res.status === 401) {
      token = null;
      if (attempt === retries) throw new Error(`401 on ${pathname}`);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt === retries) {
        return { ok: false, status: res.status, body: await res.text() };
      }
      await sleep(2000 * (attempt + 1));
      continue;
    }
    const text = await res.text();
    let parsed = null;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { ok: res.ok, status: res.status, body: parsed };
  }
  throw new Error(`exhausted retries on ${pathname}`);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------- model gate

let allowedModels = null;

export async function loadAllowedModels() {
  const res = await api('GET', '/routing/models?limit=200');
  if (!res.ok) throw new Error(`model catalog failed: ${res.status}`);
  const rows = res.body.data;
  const exempt = new Set(['OLLAMA', 'LLAMACPP']);
  allowedModels = rows.filter(
    (r) => exempt.has(r.provider) && r.isExecutionCapable === true && r.lifecycle === 'ACTIVE',
  );
  if (!ALLOW_METERED) {
    const metered = rows.filter((r) => !exempt.has(r.provider));
    if (allowedModels.length === 0) {
      throw new Error(`no free models available (catalog has ${metered.length} metered)`);
    }
  }
  return allowedModels;
}

export function assertFree(provider) {
  if (ALLOW_METERED) return;
  const normalized = String(provider).toUpperCase();
  if (normalized !== 'OLLAMA' && normalized !== 'LLAMACPP') {
    throw new Error(`REFUSED: metered provider ${provider} blocked by QA_ALLOW_METERED_MODELS=false`);
  }
}

// ------------------------------------------------------------------ chat ops

export async function createThread({ title, provider, model, maxTokens, systemPrompt }) {
  assertFree(provider);
  const res = await api('POST', '/chat-threads', {
    title,
    routingMode: 'MANUAL_MODEL',
    preferredProvider: provider,
    preferredModel: model,
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(systemPrompt === undefined ? {} : { systemPrompt }),
  });
  if (!res.ok) throw new Error(`createThread failed ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function sendMessage(threadId, content, provider, model) {
  assertFree(provider);
  const res = await api('POST', '/chat-messages', {
    threadId,
    content,
    routingMode: 'MANUAL_MODEL',
    provider,
    model,
  });
  return res;
}

/** One page of a thread, NEWEST FIRST (the API orders createdAt desc, max 100). */
export async function listMessages(threadId, limit = 100, page = 1) {
  const res = await api('GET', `/chat-messages/thread/${threadId}?limit=${limit}&page=${page}`);
  if (!res.ok) return { data: [], meta: null, error: res };
  return res.body;
}

/** Whole thread, OLDEST FIRST, walking every page. */
export async function listAllMessages(threadId) {
  const out = [];
  for (let page = 1; page <= 60; page += 1) {
    const res = await listMessages(threadId, 100, page);
    const rows = res.data ?? [];
    out.push(...rows);
    const total = res.meta?.total ?? out.length;
    if (rows.length === 0 || out.length >= total) break;
  }
  return out.reverse();
}

export async function messageCount(threadId) {
  const res = await listMessages(threadId, 1, 1);
  return res.meta?.total ?? (res.data ?? []).length;
}

/** Polls until the thread grows past `beforeCount` and the newest row is ASSISTANT. */
export async function awaitAssistant(threadId, beforeCount, { timeoutMs = 240_000 } = {}) {
  const start = Date.now();
  const deadline = start + timeoutMs;
  let delay = 1500;
  while (Date.now() < deadline) {
    await sleep(delay);
    delay = Math.min(delay * 1.2, 5000);
    const page = await listMessages(threadId, 5, 1);
    const rows = page.data ?? [];
    const total = page.meta?.total ?? rows.length;
    if (total > beforeCount && rows.length > 0 && rows[0].role === 'ASSISTANT') {
      return { ok: true, message: rows[0], total, waitedMs: Date.now() - start };
    }
  }
  return { ok: false, message: null, reason: 'TIMEOUT', waitedMs: Date.now() - start };
}

export async function getReceipt(messageId) {
  const res = await api('GET', `/chat-messages/${messageId}/context-receipt`);
  return res.ok ? res.body : null;
}

export async function previewContext(threadId, intent) {
  const res = await api('POST', `/chat-threads/${threadId}/preview-context`, { intent });
  return res.ok ? res.body : { error: res.status, body: res.body };
}

export async function deleteThread(threadId) {
  return api('DELETE', `/chat-threads/${threadId}`);
}

// ------------------------------------------------------------------- results

export function writeJson(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function appendJsonl(file, row) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
}

/** Bounded-concurrency map. Never floods the live stack. */
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
  });
  await Promise.all(runners);
  return results;
}
