// Cross-thread retrieval: the capability test and the privacy test are the
// same experiment run twice.
//
// Thread A plants facts about a named project. Threads B and C then ask the
// same question in a NEW conversation — B with the toggle off, C with it on.
//
//   B must NOT know.  Anything else is a privacy failure: the default leaked.
//   C must know.      Anything else is a capability failure: the feature is inert.
//
// A third thread asks about a project that was never discussed, to check the
// system does not invent a match just because retrieval is switched on.
import {
  login, loadAllowedModels, api, createThread, sendMessage, awaitAssistant,
  getReceipt, appendJsonl, writeJson, pool, sleep,
} from './client.mjs';

const RUN_ID = `XTHREAD-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;

const SEED_TURNS = [
  'For project MERIDIAN-88 we standardised on pnpm for every Node package. Acknowledge briefly.',
  'Also for MERIDIAN-88: every timestamp is stored in UTC only, never local time. Acknowledge briefly.',
  'And MERIDIAN-88 deploys to Frankfurt only, for data residency. Acknowledge briefly.',
];

const PROBE = 'Continue the MERIDIAN-88 project we discussed earlier. Which package manager did we standardise on, and where does it deploy? One line.';
// Unique per run, and that is load-bearing. A fixed decoy name fails on the
// SECOND run of this experiment for a correct reason: the first run's own decoy
// thread now contains the name, so retrieval finds it and is right to. The
// experiment was polluting itself and reporting the pollution as a leak.
const DECOY_ID = `SALTMARSH-${Date.now().toString(36).toUpperCase()}`;
const DECOY_PROBE = `Continue the ${DECOY_ID} project we discussed earlier. Which package manager did we standardise on? One line.`;

await login();
const models = await loadAllowedModels();
const model =
  ['kimi-k3', 'deepseek-v4-pro', 'deepseek-v4-pro:0813', 'glm-5.2']
    .map((k) => models.find((m) => m.modelKey === k))
    .find(Boolean) ?? models[0];

console.log(`base   : ${process.env.QA_LAB_BASE ?? 'https://claw-ai.co/api/v1'}`);
console.log(`model  : ${model.provider}/${model.modelKey}\n`);

/** Runs a scripted thread and returns the last answer plus its manifest. */
async function runThread(label, turns, { useCrossThreadContext }) {
  const thread = await createThread({
    title: `QA-LAB-${RUN_ID}-${label}`,
    provider: model.provider,
    model: model.modelKey,
  });
  if (useCrossThreadContext === true) {
    const patched = await api('PATCH', `/chat-threads/${thread.id}`, {
      useCrossThreadContext: true,
    });
    if (!patched.ok) throw new Error(`toggle failed ${patched.status} ${JSON.stringify(patched.body)}`);
  }
  let count = 0;
  let answer = '';
  let lastId = null;
  for (const [index, content] of turns.entries()) {
    const sent = await sendMessage(thread.id, content, model.provider, model.modelKey);
    if (!sent.ok) throw new Error(`send failed ${sent.status}`);
    count += 1;
    const reply = await awaitAssistant(thread.id, count, { timeoutMs: 300_000 });
    if (!reply.ok) throw new Error(`no reply on turn ${String(index)}`);
    count = reply.total;
    answer = String(reply.message.content ?? '');
    lastId = reply.message.id;
    await sleep(120);
  }
  const receipt = lastId === null ? null : await getReceipt(lastId);
  return { threadId: thread.id, answer, conversation: receipt?.conversation ?? null };
}

console.log('seeding thread A …');
const seedThread = await runThread('A-seed-MERIDIAN', SEED_TURNS, { useCrossThreadContext: false });
console.log(`  thread A = ${seedThread.threadId}\n`);

const cases = [
  { label: 'B-probe-OFF', turns: [PROBE], enabled: false, expectKnows: false },
  { label: 'C-probe-ON', turns: [PROBE], enabled: true, expectKnows: true },
  // A project that was never discussed. Retrieval must find nothing; whether
  // the model then invents an answer is a separate, reported concern.
  { label: 'D-decoy-ON', turns: [DECOY_PROBE], enabled: true, expectKnows: false },
];

const results = await pool(cases, 3, async (testCase) => {
  const run = await runThread(testCase.label, testCase.turns, {
    useCrossThreadContext: testCase.enabled,
  });
  const knows = /pnpm/i.test(run.answer) || /frankfurt/i.test(run.answer);
  // Scored on the MANIFEST, not on the model's words.
  //
  // The first version scored the answer text and marked the decoy a failure
  // because the model cheerfully invented "pnpm" for a project it had never
  // heard of. That is a hallucination, not a retrieval leak, and the two must
  // not share a metric: the question this experiment asks is what the system
  // PUT IN FRONT of the model, which only the manifest can answer.
  const retrieved = (run.conversation?.priorThreadsUsed ?? []).length > 0;
  const row = {
    runId: RUN_ID,
    label: testCase.label,
    threadId: run.threadId,
    toggle: testCase.enabled,
    knows,
    retrieved,
    expectKnows: testCase.expectKnows,
    pass: retrieved === testCase.expectKnows,
    hallucinated: knows && !retrieved,
    priorThreadsSearched: run.conversation?.priorThreadsSearched ?? null,
    priorThreadsUsed: run.conversation?.priorThreadsUsed ?? null,
    priorMessageIds: run.conversation?.priorMessageIds ?? null,
    crossThreadSkipReason: run.conversation?.crossThreadSkipReason ?? null,
    answer: run.answer.replace(/\s+/g, ' ').slice(0, 200),
  };
  appendJsonl(`${OUT}/cross-thread.jsonl`, row);
  return row;
});

console.log('\n=== CROSS-THREAD RETRIEVAL ===');
for (const row of results) {
  if (row === undefined || row.error !== undefined) {
    console.log(`  ${String(row?.error ?? 'unknown error')}`);
    continue;
  }
  console.log(
    `  ${row.label.padEnd(14)} toggle=${String(row.toggle).padEnd(5)} retrieved=${String(row.retrieved).padEnd(5)} ` +
      `knows=${String(row.knows).padEnd(5)} ${row.pass ? 'PASS' : 'FAIL'}${row.hallucinated ? '  [model hallucinated]' : ''}`,
  );
  console.log(`      skipReason=${String(row.crossThreadSkipReason)} searched=${JSON.stringify(row.priorThreadsSearched)} used=${JSON.stringify(row.priorThreadsUsed)}`);
  console.log(`      ${row.answer.slice(0, 140)}`);
}

const passed = results.filter((r) => r && r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
writeJson(`${OUT}/summary.json`, { runId: RUN_ID, seedThreadId: seedThread.threadId, results });
console.log(`results in ${OUT}`);
