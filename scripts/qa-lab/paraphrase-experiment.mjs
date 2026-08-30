// The decisive experiment.
//
// One planted fact, one distance, three phrasings of the SAME question.
// If recall depended on the conversation, all three would behave alike.
// Under the current filter, recall is a function of how many >=4-character
// words the question happens to share with the sentence that stated the fact.
import {
  login, loadAllowedModels, createThread, sendMessage, awaitAssistant, appendJsonl, writeJson, pool, sleep,
} from './client.mjs';

const RUN_ID = `PARAPHRASE-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;

// Mirrors ContextAssemblyManager.tokenize / calculateTokenOverlap exactly.
const IGNORED = new Set(['associate','senior','lead','principal','engineer','advisor','director','manager','analyst','strategist','consultant','support','backend','frontend','product','customer','security','operations','research','scientist','architect','designer','artist','legal','medical','finance','procurement','executive']);
const tokenize = (v) => v.toLowerCase().replaceAll(/[^a-z0-9\s]+/g, ' ').split(/\s+/).filter((t) => t.length >= 4 && !IGNORED.has(t));
const overlap = (a, b) => {
  const A = new Set(tokenize(a)); const B = new Set(tokenize(b));
  if (A.size === 0 || B.size === 0) return 0;
  let hits = 0; for (const t of A) if (B.has(t)) hits += 1;
  return hits / Math.max(Math.min(A.size, B.size), 1);
};
const isFollowUp = (p) => /(^|\b)(again|another|one more|continue|expand|shorter|longer|rewrite|rephrase|summarize that|fix that|use that|based on that|from above|previous|earlier|same answer|same style)(\b|$)/.test(p.trim().toLowerCase());

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
  { id: 'coreference', text: 'Repeat it back to me. Value only.' },
];

for (const p of PHRASINGS) {
  p.overlapVsSeed = Number(overlap(SEED, p.text).toFixed(3));
  p.keptByOverlapRule = p.overlapVsSeed >= 0.45;
  p.classifiedFollowUp = isFollowUp(p.text);
  p.predictedSeedInPrompt = p.classifiedFollowUp ? 'no (seed is >6 messages back)' : (p.keptByOverlapRule ? 'yes' : 'no');
}
console.log('static prediction from the shipped filter:');
for (const p of PHRASINGS) {
  console.log(`  ${p.id.padEnd(20)} overlap=${String(p.overlapVsSeed).padEnd(6)} followUp=${String(p.classifiedFollowUp).padEnd(5)} -> seed reaches model: ${p.predictedSeedInPrompt}`);
}

await login();
const models = await loadAllowedModels();
const chosen = ['kimi-k3', 'deepseek-v4-pro:0813', 'glm-5.2', 'qwen3.5:397b', 'gpt-oss:120b', 'minimax-m3']
  .map((k) => models.find((m) => m.modelKey === k)).filter(Boolean);
console.log(`\nrunning ${chosen.length} models x ${PHRASINGS.length} phrasings (one thread each)\n`);

const jobs = [];
for (const model of chosen) for (const phrasing of PHRASINGS) jobs.push({ model, phrasing });

const rows = await pool(jobs, 6, async ({ model, phrasing }) => {
  const thread = await createThread({
    title: `QA-LAB-${RUN_ID}-${phrasing.id}-${model.modelKey}`,
    provider: model.provider, model: model.modelKey,
  });
  let count = 0;
  const turns = [SEED, ...FILLER, phrasing.text];
  let answer = '';
  for (const [i, content] of turns.entries()) {
    const sent = await sendMessage(thread.id, content, model.provider, model.modelKey);
    if (!sent.ok) return { model: model.modelKey, phrasing: phrasing.id, error: `send ${sent.status}` };
    count += 1;
    const reply = await awaitAssistant(thread.id, count, { timeoutMs: 300_000 });
    if (!reply.ok) return { model: model.modelKey, phrasing: phrasing.id, error: 'timeout' };
    count = reply.total;
    if (i === turns.length - 1) answer = String(reply.message.content ?? '');
    await sleep(120);
  }
  const recalled = /VERDIGRIS[- ]?4417/i.test(answer);
  const row = {
    runId: RUN_ID, threadId: thread.id, model: model.modelKey, phrasing: phrasing.id,
    overlapVsSeed: phrasing.overlapVsSeed, classifiedFollowUp: phrasing.classifiedFollowUp,
    predicted: phrasing.predictedSeedInPrompt, recalled, distanceMessages: count - 1,
    answer: answer.replace(/\s+/g, ' ').slice(0, 200),
  };
  appendJsonl(`${OUT}/paraphrase.jsonl`, row);
  console.log(`  ${model.modelKey.padEnd(22)} ${phrasing.id.padEnd(20)} recalled=${String(recalled).padEnd(5)} :: ${row.answer.slice(0, 70)}`);
  return row;
});

const byPhrasing = {};
for (const r of rows) {
  if (!r || r.error) continue;
  byPhrasing[r.phrasing] ??= { n: 0, recalled: 0, predicted: r.predicted };
  byPhrasing[r.phrasing].n += 1;
  if (r.recalled) byPhrasing[r.phrasing].recalled += 1;
}
console.log('\n=== RESULT: recall rate by question phrasing (identical fact, identical distance) ===');
for (const [id, v] of Object.entries(byPhrasing)) {
  console.log(`  ${id.padEnd(20)} ${v.recalled}/${v.n} = ${Math.round((v.recalled / v.n) * 100)}%   (predicted seed in prompt: ${v.predicted})`);
}
writeJson(`${OUT}/summary.json`, { runId: RUN_ID, phrasings: PHRASINGS, byPhrasing, rows });
console.log(`\nresults in ${OUT}`);
