// Does context assembly hold up under concurrent load?
//
// Not a full load test — it does not saturate the provider, and it should not:
// the question here is whether the CONTEXT path degrades when many threads
// assemble at once, and provider queueing would mask that entirely.
//
// So it measures the server's own `retrievalMs` and `selectionMs` from the
// receipt at rising concurrency, against threads already grown to a realistic
// length. If those numbers stay flat while concurrency rises, contention is not
// in context assembly.
import {
  login, loadAllowedModels, createThread, sendMessage, awaitAssistant,
  getReceipt, appendJsonl, writeJson, pool, sleep,
} from './client.mjs';

const RUN_ID = `LOAD-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;

/** Concurrent in-flight generations to test at. */
const LEVELS = [1, 4, 8, 16];
/** Messages each thread carries before measurement begins. */
const WARM_TURNS = 12;

const FILLER = [
  'Reply with exactly one short sentence about bloom filters.',
  'Reply with exactly one short sentence about mutexes.',
  'Reply with exactly one short sentence about TCP.',
  'Reply with exactly one short sentence about DNS.',
];

await login();
const models = await loadAllowedModels();
const model =
  ['gpt-oss:20b', 'gemma4:31b'].map((k) => models.find((m) => m.modelKey === k)).find(Boolean) ??
  models[0];
console.log(`model : ${model.provider}/${model.modelKey}`);
console.log(`levels: ${LEVELS.join(', ')} concurrent · ${String(WARM_TURNS)} warm turns each\n`);

/** One thread, grown to a realistic length so assembly has real work to do. */
async function warmThread(index) {
  const thread = await createThread({
    title: `QA-LAB-${RUN_ID}-t${String(index)}`,
    provider: model.provider,
    model: model.modelKey,
  });
  let count = 0;
  for (let turn = 0; turn < WARM_TURNS; turn += 1) {
    const sent = await sendMessage(thread.id, FILLER[turn % FILLER.length], model.provider, model.modelKey);
    if (!sent.ok) break;
    count += 1;
    const reply = await awaitAssistant(thread.id, count, { timeoutMs: 300_000 });
    if (!reply.ok) break;
    count = reply.total;
  }
  return { threadId: thread.id, messages: count };
}

const maxLevel = Math.max(...LEVELS);
console.log(`warming ${String(maxLevel)} threads to ${String(WARM_TURNS)} turns …`);
const threads = await pool(
  Array.from({ length: maxLevel }, (_, i) => i),
  6,
  (index) => warmThread(index),
);
const ready = threads.filter((t) => t && t.threadId !== undefined);
console.log(`  ${String(ready.length)} threads ready (${String(ready[0]?.messages ?? 0)} messages each)\n`);

const rows = [];
for (const level of LEVELS) {
  const slice = ready.slice(0, level);
  if (slice.length < level) {
    console.log(`  level ${String(level)} skipped — only ${String(slice.length)} threads`);
    continue;
  }
  const startedAt = Date.now();
  const measured = await pool(slice, level, async (thread) => {
    const before = thread.messages;
    const sent = await sendMessage(
      thread.threadId,
      'In one short sentence: what is a write-ahead log?',
      model.provider,
      model.modelKey,
    );
    if (!sent.ok) return null;
    const reply = await awaitAssistant(thread.threadId, before + 1, { timeoutMs: 300_000 });
    if (!reply.ok) return null;
    thread.messages = reply.total;
    const receipt = await getReceipt(reply.message.id);
    const conversation = receipt?.conversation ?? null;
    if (conversation === null) return null;
    return {
      retrievalMs: conversation.retrievalMs,
      selectionMs: conversation.selectionMs,
      messagesSent: conversation.includedMessageIds.length,
      totalThreadMessages: conversation.totalThreadMessages,
    };
  });
  const ok = measured.filter((m) => m !== null && m !== undefined);
  if (ok.length === 0) {
    console.log(`  level ${String(level)} produced no measurements`);
    continue;
  }
  const pick = (key) => ok.map((m) => m[key]).sort((a, b) => a - b);
  const retrieval = pick('retrievalMs');
  const selection = pick('selectionMs');
  const row = {
    runId: RUN_ID,
    concurrency: level,
    samples: ok.length,
    wallClockMs: Date.now() - startedAt,
    retrievalP50: retrieval[Math.floor(retrieval.length / 2)],
    retrievalMax: retrieval[retrieval.length - 1],
    selectionP50: selection[Math.floor(selection.length / 2)],
    selectionMax: selection[selection.length - 1],
    allMessagesSent: ok.every((m) => m.messagesSent === m.totalThreadMessages),
  };
  rows.push(row);
  appendJsonl(`${OUT}/load.jsonl`, row);
  console.log(
    `  concurrency ${String(level).padStart(2)} · n=${String(row.samples).padStart(2)} · ` +
      `retrieval p50 ${String(row.retrievalP50).padStart(4)}ms max ${String(row.retrievalMax).padStart(5)}ms · ` +
      `selection p50 ${String(row.selectionP50).padStart(2)}ms max ${String(row.selectionMax).padStart(3)}ms · ` +
      `whole thread sent: ${String(row.allMessagesSent)}`,
  );
  await sleep(500);
}

console.log('\n=== CONTEXT ASSEMBLY UNDER CONCURRENCY ===');
console.log('  conc   n   retrieval p50/max   selection p50/max   whole thread sent');
for (const row of rows) {
  console.log(
    `  ${String(row.concurrency).padStart(4)} ${String(row.samples).padStart(3)}   ` +
      `${String(row.retrievalP50).padStart(6)}/${String(row.retrievalMax).padEnd(6)}    ` +
      `${String(row.selectionP50).padStart(6)}/${String(row.selectionMax).padEnd(6)}    ${String(row.allMessagesSent)}`,
  );
}
writeJson(`${OUT}/summary.json`, { runId: RUN_ID, model: model.modelKey, warmTurns: WARM_TURNS, rows });
console.log(`\nresults in ${OUT}`);
