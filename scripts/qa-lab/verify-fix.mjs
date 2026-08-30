// The after-measurement.
//
// Runs the identical paraphrase design as `paraphrase-experiment.mjs` against a
// deployment running the Context Composer, and prints the result beside the
// recorded pre-fix baseline. Model keys are resolved from the live catalog
// rather than hard-coded, so the same script works against any deployment.
//
//   export QA_LAB_BASE=https://claw.local/api/v1
//   export QA_LAB_EMAIL=… QA_LAB_PASSWORD=…
//   # For the local stack, trust the repo's own CA rather than disabling
//   # verification — NODE_TLS_REJECT_UNAUTHORIZED=0 would accept any
//   # certificate, including an attacker's.
//   export NODE_EXTRA_CA_CERTS=./certs/rootCA.pem
//   node verify-fix.mjs
import {
  login, loadAllowedModels, createThread, sendMessage, awaitAssistant,
  getReceipt, appendJsonl, writeJson, pool, sleep,
} from './client.mjs';

const RUN_ID = `VERIFY-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;

/** Measured against production on 2026-08-30, before the composer landed. */
const BASELINE = {
  high_overlap: { recalled: 5, of: 6 },
  low_overlap: { recalled: 0, of: 6 },
  natural_paraphrase: { recalled: 0, of: 6 },
  coreference_ambiguous: { recalled: 0, of: 6 },
  positional_reference: { recalled: null, of: 6 },
};

/** `--only <id>` re-runs a single phrasing instead of the whole matrix. */
const ONLY = (() => {
  const index = process.argv.indexOf('--only');
  return index >= 0 ? process.argv[index + 1] : null;
})();

const SEED = 'My access code for this session is VERDIGRIS-4417. Acknowledge in one short sentence.';

const FILLER = [
  'Explain in two sentences what a bloom filter is.',
  'In two sentences, what is the difference between a mutex and a semaphore?',
  'Name two common causes of TCP head-of-line blocking. One line each.',
  'In two sentences, what does the CAP theorem actually claim?',
  'Give one sentence on why DNS TTL matters for failover.',
  'In two sentences, explain copy-on-write.',
  'What is a Merkle tree used for? Two sentences.',
  'Explain leap seconds in two sentences.',
];

const PHRASINGS = [
  { id: 'high_overlap', text: 'What is my access code for this session? Reply with the code only.' },
  { id: 'low_overlap', text: 'Which secret string did I share at the start? Reply with it only.' },
  { id: 'natural_paraphrase', text: 'Remind me of the credential I mentioned earlier. Value only.' },
  // Retained for continuity with the pre-fix baseline, but it is NOT a valid
  // coreference test and its result must not be read as one. Post-fix, with the
  // whole thread demonstrably in the prompt, four of six models resolved "it"
  // to the immediately preceding turn — the filler question about leap seconds.
  // That is the correct nearest antecedent. The probe, not the system, is what
  // fails here: a bare pronoun nine turns after its intended referent, with a
  // fresh topic in between, is ambiguous to a human reader too.
  { id: 'coreference_ambiguous', text: 'Repeat it back to me. Value only.', invalidProbe: true },
  // The fair version. Zero lexical overlap with the seeding sentence, and an
  // unambiguous referent: there is exactly one "first thing".
  { id: 'positional_reference', text: 'What was the very first thing I told you in this conversation? Value only.' },
];

/** Prefers these when present; otherwise takes whatever the catalog offers. */
const PREFERRED = [
  'kimi-k3', 'deepseek-v4-pro:0813', 'deepseek-v4-pro', 'glm-5.2',
  'qwen3.5:397b', 'gpt-oss:120b', 'minimax-m3',
];

await login();
const available = await loadAllowedModels();
const byKey = new Map(available.map((m) => [m.modelKey, m]));
const chosen = [];
for (const key of PREFERRED) {
  const model = byKey.get(key);
  if (model && !chosen.some((c) => c.modelKey === model.modelKey)) chosen.push(model);
  if (chosen.length === 6) break;
}
for (const model of available) {
  if (chosen.length >= 6) break;
  if (!chosen.some((c) => c.modelKey === model.modelKey)) chosen.push(model);
}

console.log(`base    : ${process.env.QA_LAB_BASE ?? 'https://claw-ai.co/api/v1'}`);
console.log(`models  : ${chosen.map((m) => m.modelKey).join(', ')}`);
console.log(`threads : ${chosen.length * PHRASINGS.length}\n`);

const phrasings = ONLY === null ? PHRASINGS : PHRASINGS.filter((p) => p.id === ONLY);
const jobs = [];
for (const model of chosen) for (const phrasing of phrasings) jobs.push({ model, phrasing });

const rows = await pool(jobs, 4, async ({ model, phrasing }) => {
  const thread = await createThread({
    title: `QA-LAB-${RUN_ID}-${phrasing.id}-${model.modelKey}`,
    provider: model.provider,
    model: model.modelKey,
  });
  let count = 0;
  const turns = [SEED, ...FILLER, phrasing.text];
  let answer = '';
  let lastMessageId = null;
  for (const [index, content] of turns.entries()) {
    const sent = await sendMessage(thread.id, content, model.provider, model.modelKey);
    if (!sent.ok) return { model: model.modelKey, phrasing: phrasing.id, error: `send ${sent.status}` };
    count += 1;
    const reply = await awaitAssistant(thread.id, count, { timeoutMs: 300_000 });
    if (!reply.ok) return { model: model.modelKey, phrasing: phrasing.id, error: 'timeout' };
    count = reply.total;
    if (index === turns.length - 1) {
      answer = String(reply.message.content ?? '');
      lastMessageId = reply.message.id;
    }
    await sleep(120);
  }

  // The manifest is the point: it says what the model was GIVEN, independent of
  // whether the model then used it. A recall failure with the seed present in
  // includedMessageIds is a model result, not a context result.
  const receipt = lastMessageId === null ? null : await getReceipt(lastMessageId);
  const conversation = receipt?.conversation ?? null;

  const row = {
    runId: RUN_ID, threadId: thread.id, model: model.modelKey, phrasing: phrasing.id,
    recalled: /VERDIGRIS[- ]?4417/i.test(answer),
    receiptPresent: receipt !== null,
    manifestPresent: conversation !== null,
    messagesSent: conversation?.includedMessageIds.length ?? null,
    totalThreadMessages: conversation?.totalThreadMessages ?? null,
    turnsSent: conversation?.includedTurnCount ?? null,
    messagesOmitted: conversation?.omittedMessageIds.length ?? null,
    contextWindowTokens: conversation?.contextWindowTokens ?? null,
    contextWindowSource: conversation?.contextWindowSource ?? null,
    availableInputTokens: conversation?.availableInputTokens ?? null,
    estimatedInputTokens: conversation?.estimatedInputTokens ?? null,
    referenceSignals: conversation?.referenceSignals ?? null,
    answer: answer.replace(/\s+/g, ' ').slice(0, 180),
  };
  appendJsonl(`${OUT}/verify.jsonl`, row);
  console.log(
    `  ${model.modelKey.padEnd(22)} ${phrasing.id.padEnd(20)} recalled=${String(row.recalled).padEnd(5)} ` +
      `sent=${String(row.messagesSent ?? '?')}/${String(row.totalThreadMessages ?? '?')} ` +
      `win=${String(row.contextWindowTokens ?? '?')}(${row.contextWindowSource ?? '?'})`,
  );
  return row;
});

const ok = rows.filter((r) => r && !r.error);
const agg = {};
for (const row of ok) {
  agg[row.phrasing] ??= { recalled: 0, n: 0, seedSent: 0 };
  agg[row.phrasing].n += 1;
  if (row.recalled) agg[row.phrasing].recalled += 1;
  if ((row.messagesSent ?? 0) >= (row.totalThreadMessages ?? 1)) agg[row.phrasing].seedSent += 1;
}

console.log('\n=== RECALL BY PHRASING — before vs after ===');
console.log('  phrasing              before          after           whole thread sent');
for (const phrasing of phrasings) {
  const a = agg[phrasing.id];
  const b = BASELINE[phrasing.id];
  if (!a) continue;
  const before =
    b === undefined || b.recalled === null
      ? 'not measured'
      : `${b.recalled}/${b.of} (${Math.round((b.recalled / b.of) * 100)}%)`;
  const after = `${a.recalled}/${a.n} (${Math.round((a.recalled / a.n) * 100)}%)`;
  console.log(`  ${phrasing.id.padEnd(21)} ${before.padEnd(15)} ${after.padEnd(15)} ${a.seedSent}/${a.n}`);
}

const withManifest = ok.filter((r) => r.manifestPresent).length;
console.log(`\nmanifests written: ${withManifest}/${ok.length} (was 0/20 before)`);
const failedSends = rows.filter((r) => r && r.error);
if (failedSends.length > 0) console.log(`errors: ${failedSends.length}`);

writeJson(`${OUT}/summary.json`, { runId: RUN_ID, baseline: BASELINE, after: agg, rows: ok });
console.log(`\nresults in ${OUT}`);
