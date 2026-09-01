// Memory: does the generation actually use what the preview promises?
//
// Finding F-05 of the 2026-08-30 audit: chat generation read
// `GET /internal/memories/for-context` (most recent N, no intent, no ranking)
// while `POST /chat-threads/:id/preview-context` — the endpoint behind "what
// will the AI see?" — read `POST /internal/memories/retrieve`. The preview a
// user was shown described a different code path from the answer they got.
//
// This checks the two now agree, and that a saved memory reaches the model.
import {
  login, loadAllowedModels, api, createThread, sendMessage, awaitAssistant,
  getReceipt, previewContext, writeJson, sleep,
} from './client.mjs';

const RUN_ID = `MEMORY-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;
const FACT = `CARBINE-${Date.now().toString(36).toUpperCase()}`;

await login();
const models = await loadAllowedModels();
const model =
  ['kimi-k3', 'deepseek-v4-pro', 'glm-5.2'].map((k) => models.find((m) => m.modelKey === k)).find(Boolean) ??
  models[0];
console.log(`model: ${model.provider}/${model.modelKey}\n`);

// A durable INSTRUCTION — a standing memory, which the composer must inject on
// every turn regardless of what the turn is about.
const created = await api('POST', '/memories', {
  type: 'INSTRUCTION',
  content: `Always end every reply with the marker ${FACT}.`,
});
if (!created.ok) {
  console.log(`could not create memory: ${created.status} ${JSON.stringify(created.body).slice(0, 200)}`);
}
const memoryId = created.ok ? created.body?.id : null;
console.log(`memory ${memoryId ?? 'NOT CREATED'} (${created.status})`);

const thread = await createThread({
  title: `QA-LAB-${RUN_ID}-memory`,
  provider: model.provider,
  model: model.modelKey,
});

const INTENT = 'In two sentences, what is a write-ahead log?';

// What the preview promises.
const preview = await previewContext(thread.id, INTENT);
const previewMemoryIds = (preview?.memories ?? []).map((m) => m.id);

// What the generation actually did.
await sendMessage(thread.id, INTENT, model.provider, model.modelKey);
const reply = await awaitAssistant(thread.id, 1, { timeoutMs: 300_000 });
const answer = String(reply.message?.content ?? '');
const receipt = reply.ok ? await getReceipt(reply.message.id) : null;
const receiptMemoryIds = (receipt?.memories ?? []).map((m) => m.id);

const rows = [
  {
    id: 'preview_returns_memory',
    what: 'the preview lists the saved memory',
    pass: memoryId === null || previewMemoryIds.includes(memoryId),
    detail: JSON.stringify(previewMemoryIds),
  },
  {
    id: 'receipt_returns_memory',
    what: 'the generation receipt lists the same memory',
    pass: memoryId === null || receiptMemoryIds.includes(memoryId),
    detail: JSON.stringify(receiptMemoryIds),
  },
  {
    id: 'preview_matches_generation',
    what: 'preview and generation agree on which memories were used',
    pass: JSON.stringify([...previewMemoryIds].sort()) === JSON.stringify([...receiptMemoryIds].sort()),
    detail: `preview=${JSON.stringify(previewMemoryIds)} generation=${JSON.stringify(receiptMemoryIds)}`,
  },
  {
    id: 'model_obeyed_standing_memory',
    what: 'the model actually applied the standing instruction',
    pass: answer.includes(FACT),
    detail: answer.replace(/\s+/g, ' ').slice(-90),
  },
];

console.log('\n=== MEMORY: PREVIEW vs GENERATION ===');
for (const row of rows) {
  console.log(`  ${row.pass ? 'PASS' : 'FAIL'}  ${row.what}`);
  console.log(`        ${row.detail}`);
}
console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} passed`);

// Forgetting a memory is confirmation-gated (`FORGET_CONFIRMATION_REQUIRED`),
// and this cleanup used to omit the flag and ignore the result. The 400 was
// silent, so every run left its standing INSTRUCTION behind — and the NEXT run
// then had two conflicting "always end your reply with …" memories live at
// once, obeyed the older one, and reported a product failure that was really
// its own litter. A cleanup whose failure is invisible is not a cleanup.
if (memoryId !== null) {
  const forgotten = await api('DELETE', `/memories/${memoryId}?confirm=FORGET`);
  if (!forgotten.ok) {
    console.log(`WARNING: could not forget ${memoryId} (${String(forgotten.status)}) — next run may see it`);
  }
  await sleep(200);
}
writeJson(`${OUT}/summary.json`, { runId: RUN_ID, threadId: thread.id, memoryId, rows, answer });
console.log(`results in ${OUT}`);
