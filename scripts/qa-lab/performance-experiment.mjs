// What does context assembly actually cost, and does it grow with the thread?
//
// End-to-end turn latency cannot answer this: it is dominated by model
// inference, and in a polling harness it is dominated by the poll interval —
// an earlier attempt produced a suspiciously flat 5.8s p50 across every thread
// length, which was the poller's cadence and not the server's behaviour.
//
// So this reads the SERVER's own numbers out of the context receipt:
//
//   retrievalMs — network. Memories, packs, files, workspace, cross-thread,
//                 all fetched concurrently. Should be flat in thread length.
//   selectionMs — the composer's in-memory work: grouping into turns, scoring,
//                 fitting to budget. This is the one that can grow.
import {
  login, loadAllowedModels, createThread, sendMessage, awaitAssistant,
  getReceipt, appendJsonl, writeJson, sleep,
} from './client.mjs';

const RUN_ID = `PERF-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;

/** Thread lengths (in messages) at which to sample. */
const CHECKPOINTS = [10, 30, 60, 100, 160, 220];
const MAX_TURNS = Math.max(...CHECKPOINTS) / 2 + 2;

const FILLER = [
  'Reply with exactly one short sentence about bloom filters.',
  'Reply with exactly one short sentence about mutexes.',
  'Reply with exactly one short sentence about TCP.',
  'Reply with exactly one short sentence about the CAP theorem.',
  'Reply with exactly one short sentence about DNS.',
];

await login();
const models = await loadAllowedModels();
const model =
  ['gpt-oss:20b', 'gemma4:31b'].map((k) => models.find((m) => m.modelKey === k)).find(Boolean) ??
  models[0];
console.log(`model     : ${model.provider}/${model.modelKey}`);
console.log(`checkpoints: ${CHECKPOINTS.join(', ')} messages\n`);

const thread = await createThread({
  title: `QA-LAB-${RUN_ID}-perf`,
  provider: model.provider,
  model: model.modelKey,
});

const samples = [];
let count = 0;
for (let turn = 0; turn < MAX_TURNS; turn += 1) {
  const content = FILLER[turn % FILLER.length];
  const sent = await sendMessage(thread.id, content, model.provider, model.modelKey);
  if (!sent.ok) {
    console.log(`turn ${turn} send failed ${sent.status}`);
    break;
  }
  count += 1;
  const reply = await awaitAssistant(thread.id, count, { timeoutMs: 300_000 });
  if (!reply.ok) {
    console.log(`turn ${turn} no reply`);
    break;
  }
  count = reply.total;

  const nearest = CHECKPOINTS.find((c) => count >= c && count < c + 2);
  if (nearest === undefined) {
    await sleep(80);
    continue;
  }
  const receipt = await getReceipt(reply.message.id);
  const conversation = receipt?.conversation ?? null;
  if (conversation === null) {
    console.log(`  ${String(count).padStart(3)} messages — no manifest`);
    continue;
  }
  const row = {
    runId: RUN_ID,
    threadMessages: conversation.totalThreadMessages,
    messagesSent: conversation.includedMessageIds.length,
    turnsSent: conversation.includedTurnCount,
    estimatedInputTokens: conversation.estimatedInputTokens,
    availableInputTokens: conversation.availableInputTokens,
    retrievalMs: conversation.retrievalMs,
    selectionMs: conversation.selectionMs,
  };
  samples.push(row);
  appendJsonl(`${OUT}/perf.jsonl`, row);
  console.log(
    `  ${String(row.threadMessages).padStart(3)} msgs → sent ${String(row.messagesSent).padStart(3)}` +
      ` (${String(row.turnsSent).padStart(3)} turns, ${String(row.estimatedInputTokens).padStart(6)} tok)` +
      `  retrieval ${String(row.retrievalMs).padStart(5)}ms  selection ${String(row.selectionMs).padStart(4)}ms`,
  );
  if (count >= Math.max(...CHECKPOINTS)) break;
  await sleep(80);
}

console.log('\n=== CONTEXT ASSEMBLY COST vs THREAD LENGTH ===');
console.log('  thread   sent   input tok   retrievalMs   selectionMs');
for (const row of samples) {
  console.log(
    `  ${String(row.threadMessages).padStart(6)} ${String(row.messagesSent).padStart(6)} ` +
      `${String(row.estimatedInputTokens).padStart(11)} ${String(row.retrievalMs).padStart(13)} ` +
      `${String(row.selectionMs).padStart(13)}`,
  );
}
const worstSelection = Math.max(0, ...samples.map((s) => s.selectionMs));
const worstRetrieval = Math.max(0, ...samples.map((s) => s.retrievalMs));
console.log(`\nworst selection ${String(worstSelection)}ms · worst retrieval ${String(worstRetrieval)}ms`);
writeJson(`${OUT}/summary.json`, { runId: RUN_ID, threadId: thread.id, model: model.modelKey, samples });
console.log(`results in ${OUT}`);
