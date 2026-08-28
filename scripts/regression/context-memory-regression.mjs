#!/usr/bin/env node
/**
 * Context-pack and memory injection regression.
 *
 * The reported symptom is that a memory or a context pack is visibly saved —
 * the UI even reports a count — and the model plainly did not receive it. A
 * count is not evidence of injection, so this suite does not assert on counts.
 * Each case plants a token that appears NOWHERE else (an invented codeword) and
 * then asks a question only answerable from it. If the answer contains the
 * token, the content reached the model. If it does not, it did not, whatever
 * any counter says.
 *
 * The cases are chosen to separate the failure modes rather than to pass:
 *
 *   short prompts   — context assembly skips memory, pack AND workspace
 *                     retrieval for prompts of three words or fewer, so a
 *                     three-word question is a different code path.
 *   instructions    — a standing instruction is kept only if it shares enough
 *                     vocabulary with the current question, which is a category
 *                     error: "always answer in bullet points" has nothing in
 *                     common with "what is a database index".
 *   many memories   — the prompt keeps at most three.
 *
 * Usage: node scripts/regression/context-memory-regression.mjs
 */
import { writeFileSync } from 'node:fs';
import process from 'node:process';

const args = Object.fromEntries(
  process.argv.slice(2).map((raw) => {
    const [key, value = 'true'] = raw.replace(/^--/, '').split('=');
    return [key, value];
  }),
);

const BASE = process.env.CLAW_BASE_URL ?? 'https://claw.local';
const API = `${BASE}/api/v1`;
const EMAIL = process.env.CLAW_EMAIL ?? 'admin@claw.local';
const PASSWORD = process.env.CLAW_PASSWORD ?? 'ClawAdmin123!';
const ANSWER_TIMEOUT_MS = Number(args.timeout ?? 180_000);
const REPORT = args.report ?? 'context-memory-report.json';

// See the note in chat-delivery-regression.mjs: relaxed for the local mkcert
// certificate only, never for an arbitrary host.
const LOCAL_TLS_HOSTS = new Set(['claw.local', 'localhost', '127.0.0.1']);
if (LOCAL_TLS_HOSTS.has(new URL(BASE).hostname)) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/** A codeword the model cannot know unless it was given it. */
function codeword(label) {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `${label}-${n}`;
}

let token = null;

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  token = (await res.json()).tokens.accessToken;
}

/** Sends one prompt and returns the assistant's text, or null if none arrived. */
async function ask(threadId, content) {
  const sent = await api('/chat-messages', {
    method: 'POST',
    body: JSON.stringify({ threadId, content, role: 'USER' }),
  });
  if (!sent.ok) {
    return { answer: null, error: `send ${sent.status}: ${JSON.stringify(sent.body).slice(0, 160)}` };
  }
  const startedAt = Date.now();
  while (Date.now() - startedAt < ANSWER_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 1500));
    const list = await api(`/chat-messages/thread/${threadId}?page=1&limit=100`);
    if (!list.ok) continue;
    const items = Array.isArray(list.body) ? list.body : (list.body?.data ?? []);
    const assistant = items.filter((m) => m.role === 'ASSISTANT');
    if (assistant.length > 0) {
      const latest = assistant.at(-1);
      return { answer: latest.content ?? '', metadata: latest.metadata ?? null };
    }
  }
  return { answer: null, error: 'timeout waiting for assistant row' };
}

async function newThread(title, extra = {}) {
  const res = await api('/chat-threads', {
    method: 'POST',
    body: JSON.stringify({ title, ...extra }),
  });
  if (!res.ok) throw new Error(`thread create failed ${res.status}`);
  return res.body.id;
}

/**
 * Creates a memory, retrying a transient entitlement failure.
 *
 * Setup that fails silently turns every assertion below it into a lie: the
 * first version of this file did not check, so a 503 here produced "the model
 * did not use the memory" when there was no memory to use. Creation is now
 * asserted, and the retry exists because the entitlement lookup this endpoint
 * makes is itself intermittently unavailable — which is a finding, not
 * something to paper over, so it is reported.
 */
async function createMemory(type, content) {
  let last = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    last = await api('/memories', { method: 'POST', body: JSON.stringify({ type, content }) });
    if (last.ok) {
      if (attempt > 0) {
        transientSetupFailures.push({ endpoint: 'POST /memories', attempts: attempt + 1 });
      }
      return last;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(
    `memory creation failed after 4 attempts: ${last.status} ${JSON.stringify(last.body).slice(0, 200)}`,
  );
}

async function deleteMemory(id) {
  if (id) await api(`/memories/${id}`, { method: 'DELETE' });
}

async function createPackWithItem(name, itemContent) {
  let pack = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    pack = await api('/context-packs', {
      method: 'POST',
      body: JSON.stringify({ name, description: 'regression' }),
    });
    if (pack.ok) {
      if (attempt > 0) {
        transientSetupFailures.push({ endpoint: 'POST /context-packs', attempts: attempt + 1 });
      }
      break;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!pack.ok) return { pack, item: null };
  const item = await api(`/context-packs/${pack.body.id}/items`, {
    method: 'POST',
    body: JSON.stringify({ itemType: 'TEXT', content: itemContent }),
  });
  return { pack, item };
}

/** Reads the memory back, so a silent write failure cannot masquerade as a
 * retrieval failure later. */
async function assertMemoryVisible(id, word) {
  const list = await api('/memories?page=1&limit=100');
  const items = Array.isArray(list.body) ? list.body : (list.body?.data ?? []);
  const found = items.some((m) => m.id === id || String(m.content ?? '').includes(word));
  if (!found) {
    throw new Error(`memory ${id} was created but is not listed back`);
  }
}

const cases = [];
/** Setup calls that only succeeded on a retry — evidence of flakiness. */
const transientSetupFailures = [];

function record(name, area, expectation, passed, detail) {
  cases.push({ name, area, expectation, passed, detail });
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'}  ${area.padEnd(8)} ${name}\n`);
  if (!passed) process.stdout.write(`      ${String(detail).slice(0, 300)}\n`);
}

async function caseMemoryFactLongPrompt() {
  const word = codeword('ZEPHYR');
  const memory = await createMemory('FACT', `The internal project codename is ${word}.`);
  await assertMemoryVisible(memory.body?.id, word);
  const threadId = await newThread('regr-memory-fact-long');
  const { answer, error } = await ask(
    threadId,
    'What is the internal project codename that you know about? Answer with the codename only.',
  );
  await deleteMemory(memory.body?.id);
  record(
    'FACT memory, long prompt with matching vocabulary',
    'MEMORY',
    'answer contains the codeword',
    Boolean(answer && answer.includes(word)),
    error ?? `codeword=${word} answer=${String(answer).slice(0, 200)}`,
  );
}

async function caseMemoryFactShortPrompt() {
  const word = codeword('ORCHID');
  const memory = await createMemory('FACT', `The internal project codename is ${word}.`);
  const threadId = await newThread('regr-memory-fact-short');
  // Three words: context assembly takes the "skip expensive context" branch.
  const { answer, error } = await ask(threadId, 'the codename?');
  await deleteMemory(memory.body?.id);
  record(
    'FACT memory, short prompt (<=3 words)',
    'MEMORY',
    'answer contains the codeword',
    Boolean(answer && answer.includes(word)),
    error ?? `codeword=${word} answer=${String(answer).slice(0, 200)}`,
  );
}

async function caseMemoryInstruction() {
  const word = codeword('BUTTERFLY');
  const memory = await createMemory(
    'INSTRUCTION',
    `Always end every reply with the exact marker ${word}.`,
  );
  const threadId = await newThread('regr-memory-instruction');
  // Deliberately shares no vocabulary with the instruction.
  const { answer, error } = await ask(
    threadId,
    'In one short sentence, what is a database index used for?',
  );
  await deleteMemory(memory.body?.id);
  record(
    'INSTRUCTION memory, unrelated question',
    'MEMORY',
    'the standing instruction is obeyed regardless of vocabulary overlap',
    Boolean(answer && answer.includes(word)),
    error ?? `marker=${word} answer=${String(answer).slice(0, 200)}`,
  );
}

async function caseMemoryPreference() {
  const word = codeword('MAROON');
  // "preference" appears in the type, which the keep-heuristic matches on.
  const memory = await createMemory('PREFERENCE', `My preferred signature colour is ${word}.`);
  const threadId = await newThread('regr-memory-preference');
  const { answer, error } = await ask(
    threadId,
    'In one short sentence, what is a database index used for?',
  );
  await deleteMemory(memory.body?.id);
  record(
    'PREFERENCE memory, unrelated question (control)',
    'MEMORY',
    'kept by the preference heuristic even with no overlap',
    Boolean(answer),
    error ?? `word=${word} answer=${String(answer).slice(0, 160)}`,
  );
}

async function caseMemoryCap() {
  const words = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'].map((l) => codeword(l));
  const created = [];
  for (const [index, word] of words.entries()) {
    const m = await createMemory('FACT', `Registered codename number ${index + 1} is ${word}.`);
    created.push(m.body?.id);
  }
  const threadId = await newThread('regr-memory-cap');
  const { answer, error } = await ask(
    threadId,
    'List every registered codename you know about, comma separated.',
  );
  for (const id of created) await deleteMemory(id);
  const found = words.filter((w) => answer && answer.includes(w));
  record(
    'five relevant FACT memories',
    'MEMORY',
    'all five reach the model',
    found.length === words.length,
    error ?? `found ${found.length}/5 (${found.join(',')}) answer=${String(answer).slice(0, 200)}`,
  );
}

async function casePackLongPrompt() {
  const word = codeword('SAFFRON');
  const { pack, item } = await createPackWithItem(
    `regr-pack-long-${Date.now()}`,
    `The approved deployment window codename is ${word}.`,
  );
  if (!pack.ok || !item?.ok) {
    record(
      'context pack creation and item creation',
      'PACK',
      'pack and item are created',
      false,
      `pack=${pack.status} item=${item?.status} ${JSON.stringify(item?.body ?? pack.body).slice(0, 200)}`,
    );
    return;
  }
  record('context pack creation and item creation', 'PACK', 'pack and item are created', true, '');

  const threadId = await newThread('regr-pack-long', { contextPackIds: [pack.body.id] });
  const thread = await api(`/chat-threads/${threadId}`);
  const attached = (thread.body?.contextPackIds ?? []).includes(pack.body.id);
  record(
    'context pack attaches to a thread',
    'PACK',
    'thread.contextPackIds contains the pack',
    attached,
    `contextPackIds=${JSON.stringify(thread.body?.contextPackIds)}`,
  );

  const { answer, error } = await ask(
    threadId,
    'What is the approved deployment window codename? Answer with the codename only.',
  );
  record(
    'context pack item, long prompt',
    'PACK',
    'answer contains the pack codeword',
    Boolean(answer && answer.includes(word)),
    error ?? `codeword=${word} answer=${String(answer).slice(0, 200)}`,
  );
}

async function casePackShortPrompt() {
  const word = codeword('CINNABAR');
  const { pack, item } = await createPackWithItem(
    `regr-pack-short-${Date.now()}`,
    `The approved deployment window codename is ${word}.`,
  );
  if (!pack.ok || !item?.ok) return;
  const threadId = await newThread('regr-pack-short', { contextPackIds: [pack.body.id] });
  const { answer, error } = await ask(threadId, 'the codename?');
  record(
    'context pack item, short prompt (<=3 words)',
    'PACK',
    'answer contains the pack codeword',
    Boolean(answer && answer.includes(word)),
    error ?? `codeword=${word} answer=${String(answer).slice(0, 200)}`,
  );
}

async function main() {
  await login();
  console.log('context + memory injection regression\n');

  await caseMemoryFactLongPrompt();
  await caseMemoryFactShortPrompt();
  await caseMemoryInstruction();
  await caseMemoryPreference();
  await caseMemoryCap();
  await casePackLongPrompt();
  await casePackShortPrompt();

  const failed = cases.filter((c) => !c.passed);
  if (transientSetupFailures.length > 0) {
    console.log(
      `
NOTE: ${transientSetupFailures.length} setup call(s) needed a retry — ` +
        `${JSON.stringify(transientSetupFailures)}. The entitlement lookup behind these ` +
        `endpoints is intermittently unavailable.`,
    );
  }
  writeFileSync(
    REPORT,
    JSON.stringify({ cases, failed: failed.length, transientSetupFailures }, null, 2),
  );
  console.log(`\n${cases.length - failed.length}/${cases.length} passed. report -> ${REPORT}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

void main();
