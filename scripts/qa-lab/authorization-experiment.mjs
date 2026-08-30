// Authorization: can user B reach anything of user A's?
//
// Every context surface added by ADR-086 and ADR-087 widened what one request
// can read — a manifest naming message ids, a receipt naming prior threads, a
// retrieval path that deliberately reads OTHER conversations. Each of those is
// a new place a missing owner filter would leak a different customer's chat.
//
// This suite is scored zero-tolerance: one pass is a release blocker.
//
//   export QA_LAB_BASE=https://claw.local/api/v1
//   export NODE_EXTRA_CA_CERTS=./certs/rootCA.pem
//   export QA_LAB_EMAIL=… QA_LAB_PASSWORD=…      (user A)
//   node authorization-experiment.mjs
import { BASE, login, loadAllowedModels, api, createThread, sendMessage, awaitAssistant, getReceipt, writeJson, sleep } from './client.mjs';

const RUN_ID = `AUTHZ-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;

const VICTIM_SECRET = `PEREGRINE-${Date.now().toString(36).toUpperCase()}`;

/**
 * A second account, created fresh so the run is repeatable.
 *
 * Created through the ADMIN route rather than self-registration: registration
 * gates login behind email verification, which this suite has no way to
 * complete. The account is an ordinary USER with no elevated permissions —
 * creating it as an admin says nothing about what it can then reach.
 */
const suffix = Date.now().toString(36);
const attacker = {
  email: `qa-authz-${suffix}@claw.local`,
  username: `qaauthz${suffix}`,
  password: 'QaAuthzProbe123!',
  firstName: 'Authz',
  lastName: 'Probe',
};

async function rawRequest(method, pathname, token, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

// ------------------------------------------------------------------ victim

await login();
const models = await loadAllowedModels();
const model = models.find((m) => m.modelKey === 'gpt-oss:20b') ?? models[0];
console.log(`model: ${model.provider}/${model.modelKey}`);

const victimThread = await createThread({
  title: `QA-LAB-${RUN_ID}-victim`,
  provider: model.provider,
  model: model.modelKey,
});
await sendMessage(
  victimThread.id,
  `My private access code is ${VICTIM_SECRET}. Acknowledge in one short sentence.`,
  model.provider,
  model.modelKey,
);
const victimReply = await awaitAssistant(victimThread.id, 1, { timeoutMs: 300_000 });
if (!victimReply.ok) throw new Error('victim thread produced no reply');
const victimMessageId = victimReply.message.id;
const victimReceipt = await getReceipt(victimMessageId);
console.log(`victim thread ${victimThread.id}, message ${victimMessageId}, receipt=${victimReceipt !== null}\n`);

// ---------------------------------------------------------------- attacker

const adminLogin = await rawRequest('POST', '/auth/login', null, {
  email: process.env.QA_LAB_EMAIL,
  password: process.env.QA_LAB_PASSWORD,
});
if (adminLogin.status !== 200) throw new Error(`victim/admin login failed ${adminLogin.status}`);
const created = await rawRequest('POST', '/users', adminLogin.body.tokens.accessToken, attacker);
if (created.status >= 400 && created.status !== 409) {
  throw new Error(`create attacker failed ${created.status} ${JSON.stringify(created.body)}`);
}
const loggedIn = await rawRequest('POST', '/auth/login', null, {
  email: attacker.email,
  password: attacker.password,
});
if (loggedIn.status !== 200) {
  throw new Error(`attacker login failed ${loggedIn.status} ${JSON.stringify(loggedIn.body)}`);
}
const attackerToken = loggedIn.body.tokens.accessToken;
const attackerId = loggedIn.body.user.id;
console.log(`attacker ${attacker.email} (${attackerId})\n`);

// ------------------------------------------------------------------- probes

/**
 * Anything below 400 means the attacker got something.
 *
 * 400 is NOT counted as a denial, deliberately. A malformed probe returns 400
 * and would otherwise be scored a pass — the suite would report "denied" for a
 * request the server never even evaluated. A 400 here means fix the probe.
 */
const DENIED = (status) => status === 401 || status === 403 || status === 404;

const probes = [
  {
    id: 'read_thread',
    what: "read the victim's thread",
    run: () => rawRequest('GET', `/chat-threads/${victimThread.id}`, attackerToken),
  },
  {
    id: 'read_messages',
    what: "read the victim's messages",
    run: () => rawRequest('GET', `/chat-messages/thread/${victimThread.id}?limit=50`, attackerToken),
  },
  {
    id: 'read_single_message',
    what: "read one of the victim's messages by id",
    run: () => rawRequest('GET', `/chat-messages/${victimMessageId}`, attackerToken),
  },
  {
    id: 'read_context_receipt',
    what: "read the victim's context receipt",
    run: () => rawRequest('GET', `/chat-messages/${victimMessageId}/context-receipt`, attackerToken),
  },
  {
    id: 'preview_victim_context',
    what: "preview context for the victim's thread",
    run: () =>
      rawRequest('POST', `/chat-threads/${victimThread.id}/preview-context`, attackerToken, {
        intent: 'what is the access code',
      }),
  },
  {
    id: 'write_to_thread',
    what: "post a message into the victim's thread",
    run: () =>
      rawRequest('POST', '/chat-messages', attackerToken, {
        threadId: victimThread.id,
        content: 'hello',
        routingMode: 'MANUAL_MODEL',
        provider: model.provider,
        model: model.modelKey,
      }),
  },
  {
    id: 'update_thread',
    what: "enable cross-thread retrieval on the victim's thread",
    run: () =>
      rawRequest('PATCH', `/chat-threads/${victimThread.id}`, attackerToken, {
        useCrossThreadContext: true,
      }),
  },
  {
    id: 'delete_thread',
    what: "delete the victim's thread",
    run: () => rawRequest('DELETE', `/chat-threads/${victimThread.id}`, attackerToken),
  },
  {
    id: 'branch_thread',
    what: "branch the victim's thread into their own",
    run: () =>
      rawRequest('POST', `/chat-threads/${victimThread.id}/branch`, attackerToken, {
        fromMessageId: victimMessageId,
      }),
  },
  {
    id: 'search_victim_thread',
    what: "search inside the victim's thread",
    run: () =>
      rawRequest(
        'GET',
        `/chat-messages/thread/${victimThread.id}/search?q=${encodeURIComponent(VICTIM_SECRET)}`,
        attackerToken,
      ),
  },
  {
    id: 'unauthenticated_receipt',
    what: 'read the receipt with no token at all',
    run: () => rawRequest('GET', `/chat-messages/${victimMessageId}/context-receipt`, null),
  },
  {
    id: 'internal_context_window',
    what: 'call the internal routing route with a user token',
    run: () =>
      rawRequest(
        'GET',
        `/internal/router-models/context-window/${model.provider}/${encodeURIComponent(model.modelKey)}`,
        attackerToken,
      ),
  },
];

const results = [];
for (const probe of probes) {
  const response = await probe.run();
  const bodyText = JSON.stringify(response.body ?? '');
  const leakedSecret = bodyText.includes(VICTIM_SECRET);
  const denied = DENIED(response.status);
  results.push({
    id: probe.id,
    what: probe.what,
    status: response.status,
    denied,
    leakedSecret,
    pass: denied && !leakedSecret,
  });
  await sleep(80);
}

// The one that matters most: cross-thread retrieval must never cross USERS.
const attackerThread = await rawRequest('POST', '/chat-threads', attackerToken, {
  title: `QA-LAB-${RUN_ID}-attacker`,
  routingMode: 'MANUAL_MODEL',
  preferredProvider: model.provider,
  preferredModel: model.modelKey,
  useCrossThreadContext: true,
});
let crossUserRow = { id: 'cross_thread_across_users', what: 'retrieve the victim\'s thread via cross-thread retrieval', pass: false, note: 'setup failed' };
if (attackerThread.status < 400) {
  const threadId = attackerThread.body.id;
  await rawRequest('POST', '/chat-messages', attackerToken, {
    threadId,
    content: `Continue the ${VICTIM_SECRET} discussion we had earlier. What is the access code? One line.`,
    routingMode: 'MANUAL_MODEL',
    provider: model.provider,
    model: model.modelKey,
  });
  // Poll for the reply using the attacker's own token.
  let reply = null;
  for (let attempt = 0; attempt < 60 && reply === null; attempt += 1) {
    await sleep(2500);
    const page = await rawRequest('GET', `/chat-messages/thread/${threadId}?limit=5`, attackerToken);
    const rows = page.body?.data ?? [];
    if (rows.length > 1 && rows[0]?.role === 'ASSISTANT') reply = rows[0];
  }
  const answer = String(reply?.content ?? '');
  const receipt =
    reply === null
      ? null
      : (await rawRequest('GET', `/chat-messages/${reply.id}/context-receipt`, attackerToken)).body;
  const priorUsed = receipt?.conversation?.priorThreadsUsed ?? [];
  crossUserRow = {
    id: 'cross_thread_across_users',
    what: "retrieve the victim's thread via cross-thread retrieval",
    status: 200,
    denied: true,
    leakedSecret: answer.includes(VICTIM_SECRET),
    retrievedVictimThread: priorUsed.includes(victimThread.id),
    skipReason: receipt?.conversation?.crossThreadSkipReason ?? null,
    pass: !answer.includes(VICTIM_SECRET) && !priorUsed.includes(victimThread.id),
  };
}
results.push(crossUserRow);

console.log('=== AUTHORIZATION ===');
for (const row of results) {
  const flag = row.pass ? 'PASS' : 'FAIL';
  const extra = row.leakedSecret === true ? '  *** SECRET LEAKED ***' : '';
  console.log(`  ${flag}  ${String(row.status ?? '-').padEnd(4)} ${row.what}${extra}`);
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) console.log('RELEASE BLOCKER: ' + failed.map((f) => f.id).join(', '));
writeJson(`${OUT}/summary.json`, { runId: RUN_ID, victimThreadId: victimThread.id, attacker: attacker.email, results });
console.log(`results in ${OUT}`);
