// Long-thread stress: does the whole conversation still reach the model when a
// thread runs to hundreds of messages?
//
// The earlier suites prove the CONTRACT at ordinary lengths (20-60 messages).
// This one runs threads far past the point where the token budget must start
// evicting, because that is where a context system either degrades honestly or
// lies. Two different things are measured, and conflating them is how the
// original defect survived so long:
//
//   DELIVERY  — did the composer hand the model every message it had budget
//               for, and evict ONLY for budget? This is the product's promise
//               and it must hold at every length.
//   RECALL    — did the model then use what it was given? This is the model's
//               job, and a weak model failing it is not a context bug.
//
// So every probe records the manifest alongside the answer. A recall failure on
// a turn where the fact was demonstrably IN the prompt is reported as a model
// result, never as a context regression.
//
// Memories are user-scoped and inject into every thread, so a shared account's
// leftovers can compete with the facts a scenario plants. `--isolated` mints a
// fresh account to rule that out; see the note above `createIsolatedUser` below
// for why this particular harness does not need it, and what it costs.
import {
  login, createIsolatedUser, loadAllowedModels, createThread, sendMessage, awaitAssistant,
  getReceipt, appendJsonl, writeJson, pool, assertFree,
} from './client.mjs';

const args = process.argv.slice(2).reduce((acc, cur, i, arr) => {
  if (cur.startsWith('--')) acc[cur.slice(2)] = arr[i + 1] ?? 'true';
  return acc;
}, {});

/** Threads to run in parallel families. */
const THREADS = Number(args.threads ?? 12);
/** User turns per thread. Each turn produces a user + an assistant message. */
const TURNS = Number(args.turns ?? 120);
/** Simultaneous in-flight generations across the whole run. */
const WORKERS = Number(args.workers ?? 4);

const RUN_ID = `STRESS-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;

const log = (msg) => {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
};

// Filler is deliberately boring and self-contained: it must add LENGTH without
// adding facts that could be confused with the planted ones.
const FILLER = [
  'In one short sentence, what is a bloom filter?',
  'In one short sentence, what is a write-ahead log?',
  'In one short sentence, what is consistent hashing?',
  'In one short sentence, what is a merkle tree?',
  'In one short sentence, what is backpressure?',
  'In one short sentence, what is a vector clock?',
  'In one short sentence, what is quorum consensus?',
  'In one short sentence, what is copy-on-write?',
];

// `--verbose` swaps in filler that asks for real prose.
//
// One-sentence answers are cheap, and a 432-message thread of them came to
// 12,780 tokens against a 24,515 budget — so the eviction path never ran and
// "0 delivery violations" only ever proved the easy case. Long answers push a
// thread past its own window, which is where the composer has to start
// choosing and where its choices are worth checking.
const VERBOSE_FILLER = [
  'Explain bloom filters in about 200 words, including false-positive behaviour.',
  'Explain write-ahead logging in about 200 words, including crash recovery.',
  'Explain consistent hashing in about 200 words, including virtual nodes.',
  'Explain merkle trees in about 200 words, including anti-entropy repair.',
  'Explain backpressure in about 200 words, including bounded queues.',
  'Explain vector clocks in about 200 words, including concurrent updates.',
  'Explain quorum consensus in about 200 words, including R + W > N.',
  'Explain copy-on-write in about 200 words, including snapshot isolation.',
];

/**
 * An upstream provider refusing on ITS OWN account limits, returned as a normal
 * assistant message. Matched on the shape every such notice shares rather than
 * on one vendor's wording, so a second provider's phrasing is still caught.
 */
const PROVIDER_LIMIT_PATTERN = /usage limit|rate limit|quota exceeded|upgrade for higher|insufficient (credit|balance)/i;

const VERBOSE = args.verbose === 'true';
const fillerAt = (turn) =>
  VERBOSE ? VERBOSE_FILLER[turn % VERBOSE_FILLER.length] : FILLER[turn % FILLER.length];

/**
 * A thread of `TURNS` user turns that plants a uniquely-named fact every tenth
 * turn and re-asks for earlier ones at ever-growing distance.
 *
 * Facts carry a per-thread nonce. Without one, a probe can be satisfied by
 * another thread's value (or by a previous run's), which reads as a pass and
 * hides a real failure.
 */
function buildPlan(nonce) {
  const plan = [];
  const facts = [];
  for (let turn = 0; turn < TURNS; turn += 1) {
    if (turn % 10 === 0) {
      const index = facts.length + 1;
      const value = `${nonce}-${String(index).padStart(2, '0')}`;
      facts.push({ index, value, plantedAtTurn: turn });
      plan.push({
        kind: 'plant',
        factIndex: index,
        content: `Record this: parameter ${String(index)} is ${value}. Acknowledge in one short sentence.`,
      });
      continue;
    }
    // Probe on turns ending in 5. ALTERNATE between the very first fact and a
    // recent one.
    //
    // The obvious design — cycle through the fact list — is what this used to
    // do, and it quietly never tests anything: in a 432-message thread it
    // asked at a maximum distance of 31 messages, because the cycle keeps
    // landing on a recent fact. A distance test whose distance is bounded by
    // its own indexing measures nothing about distance. Always re-asking
    // fact #1 is what makes the probe distance grow with the thread.
    if (turn % 5 === 0 && facts.length > 0) {
      const askOldest = (turn / 5) % 2 === 1;
      const target = askOldest ? facts[0] : facts[facts.length - 1];
      plan.push({
        kind: 'probe',
        factIndex: target.index,
        expect: target.value,
        plantedAtTurn: target.plantedAtTurn,
        content: `What is the value of parameter ${String(target.index)}? Reply with the value only, nothing else.`,
      });
      continue;
    }
    plan.push({ kind: 'filler', content: fillerAt(turn) });
  }
  return plan;
}

// `--isolated` mints a brand-new account, which is the right call whenever a
// scenario plants a fact under a GENERIC name ("the project codename") that a
// leftover memory could also claim. It costs quota headroom though: a fresh
// account lands on the Free plan and its daily token quota is exhausted inside
// ~15 turns of a long thread, so a run of this size cannot finish there.
//
// This harness does not need it. Every planted value carries a per-thread nonce
// (`P<slot><time>-07`), so no stored memory can answer "what is the value of
// parameter 7?" — a collision would require a memory naming that exact string.
// Isolation stays available for scenarios that are not collision-proof.
const isolated = args.isolated === 'true';
const account = isolated ? await createIsolatedUser('stress') : await login();
const models = await loadAllowedModels();
const preferred = ['gpt-oss:20b', 'kimi-k3', 'glm-5.2', 'deepseek-v4-pro', 'gemma4:31b', 'minimax-m3'];
const chosen = preferred.map((k) => models.find((m) => m.modelKey === k)).filter(Boolean);
const roster = chosen.length > 0 ? chosen : models.slice(0, 6);
for (const m of roster) assertFree(m.provider);

log(`run ${RUN_ID}`);
log(`account ${account.email ?? account.id} ${isolated ? '(fresh, zero memories)' : '(lab account; facts are nonce-scoped)'} · ${String(roster.length)} models`);
log(`${String(THREADS)} threads x ${String(TURNS)} turns = ${String(THREADS * TURNS * 2)} messages, ${String(WORKERS)} workers`);
log(`models: ${roster.map((m) => m.modelKey).join(', ')}\n`);

const started = Date.now();
let sent = 0;
let failed = 0;
let quotaExhausted = false;
let providerLimited = false;

async function runThread(slot) {
  const model = roster[slot % roster.length];
  const nonce = `P${slot.toString(36).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const plan = buildPlan(nonce);
  const label = `stress-${String(slot).padStart(2, '0')}-${model.modelKey}`;

  const thread = await createThread({
    title: `QA-LAB-${RUN_ID}-${label}`,
    provider: model.provider,
    model: model.modelKey,
  });

  let count = 0;
  let probes = 0;
  let recalled = 0;
  let deliveryViolations = 0;
  let unmeasured = 0;

  for (const [turnIndex, step] of plan.entries()) {
    const res = await sendMessage(thread.id, step.content, model.provider, model.modelKey);
    if (!res.ok) {
      failed += 1;
      appendJsonl(`${OUT}/errors.jsonl`, { runId: RUN_ID, label, turnIndex, status: res.status, body: res.body });
      // A quota rejection is not a flaky turn — every remaining thread will hit
      // it too, and the run would otherwise finish "successfully" on a tenth of
      // the messages it claims to have tested. Say so and stop.
      if (res.status === 429) {
        quotaExhausted = true;
        log(`QUOTA EXHAUSTED at ${label} turn ${String(turnIndex)} — aborting run`);
      }
      break;
    }
    if (quotaExhausted || providerLimited) break;
    sent += 1;
    const reply = await awaitAssistant(thread.id, count, { timeoutMs: 300_000 });
    if (!reply.ok) {
      failed += 1;
      appendJsonl(`${OUT}/errors.jsonl`, { runId: RUN_ID, label, turnIndex, reason: reply.reason });
      break;
    }
    count = reply.total;

    // The provider behind a PAYG-exempt connector has its own account limits,
    // and when it hits one it answers 200 OK with a sentence of apology as the
    // assistant message. Nothing upstream of here can tell that from a real
    // reply: the turn succeeds, the message is stored, and a recall probe
    // simply scores 0 because the marker is not in the refusal text.
    //
    // Measured: a run scored 34% recall and looked like context collapse past
    // ~200 messages. 84 of its 127 probes were this string. Recall on the 43
    // real answers was 43/43. A harness that cannot tell "the model answered
    // wrongly" from "no model ran" reports the provider's billing state as a
    // product defect.
    if (PROVIDER_LIMIT_PATTERN.test(String(reply.message?.content ?? ''))) {
      providerLimited = true;
      log(`PROVIDER LIMIT hit at ${label} turn ${String(turnIndex)} — aborting run, results are not comparable`);
      appendJsonl(`${OUT}/errors.jsonl`, {
        runId: RUN_ID, label, turnIndex, reason: 'PROVIDER_USAGE_LIMIT',
        answer: String(reply.message?.content ?? '').slice(0, 200),
      });
      break;
    }

    if (turnIndex > 0 && turnIndex % 25 === 0) {
      log(`  ${label}: turn ${String(turnIndex)}/${String(plan.length)} · ${String(count)} msgs · recall ${String(recalled)}/${String(probes)}`);
    }

    if (step.kind !== 'probe') continue;

    probes += 1;
    const answer = String(reply.message?.content ?? '');
    const hit = answer.toUpperCase().includes(step.expect.toUpperCase());
    if (hit) recalled += 1;

    const receipt = await getReceipt(reply.message.id);
    const conv = receipt?.conversation ?? null;
    const included = conv?.includedMessageIds?.length ?? null;
    const total = conv?.totalThreadMessages ?? null;
    const whole = included !== null && total !== null && included >= total;

    // DELIVERY is the product's promise, and this is the assertion that would
    // have caught the original defect: messages may be missing ONLY because the
    // budget was genuinely consumed. A thread trimmed while 20%+ of the input
    // budget is still unspent means something is dropping messages on a rule
    // again — which is exactly how the old lexical-overlap filter behaved, and
    // it left plenty of room unused while doing it.
    const budget = conv?.availableInputTokens ?? null;
    const used = conv?.estimatedInputTokens ?? null;
    const roomLeft = budget !== null && used !== null && used < budget * 0.8;
    // A probe with NO manifest proves nothing, and must never be scored as a
    // pass. The first version of this check treated every null as "no
    // violation", so a run where 84 of 127 probes produced no receipt at all
    // still reported "DELIVERY violations 0" — the exact silent-pass shape this
    // harness exists to catch, reproduced inside the harness.
    const measured = conv !== null && total !== null;
    const deliveryOk = measured && (whole || !roomLeft);
    if (!measured) unmeasured += 1;
    else if (!deliveryOk) deliveryViolations += 1;

    const reasons = {};
    for (const reason of Object.values(conv?.omissionReasons ?? {})) {
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }

    appendJsonl(`${OUT}/probes.jsonl`, {
      runId: RUN_ID, label, model: model.modelKey, turnIndex,
      factIndex: step.factIndex, expect: step.expect,
      distanceMessages: count - (step.plantedAtTurn * 2 + 1),
      threadMessages: count,
      recalled: hit,
      includedMessages: included,
      totalThreadMessages: total,
      wholeThreadSent: whole,
      estimatedInputTokens: used,
      availableInputTokens: budget,
      omittedMessages: conv?.omittedMessageIds?.length ?? null,
      omissionReasons: reasons,
      contextWindowSource: conv?.contextWindowSource ?? null,
      retrievalMs: conv?.retrievalMs ?? null,
      selectionMs: conv?.selectionMs ?? null,
      deliveryOk,
      answer: answer.replace(/\s+/g, ' ').slice(0, 120),
    });
  }

  log(
    `done ${label}: ${String(count)} msgs · recall ${String(recalled)}/${String(probes)} · ` +
      `delivery violations ${String(deliveryViolations)} · unmeasured ${String(unmeasured)}`,
  );
  return { label, model: model.modelKey, messages: count, probes, recalled, deliveryViolations, unmeasured };
}

const threads = await pool(Array.from({ length: THREADS }, (_, i) => i), WORKERS, (slot) => runThread(slot));
const ok = threads.filter((t) => t && t.messages !== undefined);

const totalMessages = ok.reduce((a, t) => a + t.messages, 0);
const totalProbes = ok.reduce((a, t) => a + t.probes, 0);
const totalRecalled = ok.reduce((a, t) => a + t.recalled, 0);
const totalViolations = ok.reduce((a, t) => a + t.deliveryViolations, 0);
const totalUnmeasured = ok.reduce((a, t) => a + t.unmeasured, 0);

console.log('\n=== STRESS: LONG THREADS ===');
console.log(`  threads            ${String(ok.length)}/${String(THREADS)}`);
console.log(`  messages in threads${String(totalMessages).padStart(8)}`);
console.log(`  turns sent         ${String(sent).padStart(8)}  failed ${String(failed)}`);
console.log(`  recall             ${String(totalRecalled)}/${String(totalProbes)}`);
console.log(`  DELIVERY violations${String(totalViolations).padStart(8)}   <- must be 0`);
console.log(`  unmeasured probes  ${String(totalUnmeasured).padStart(8)}   <- no manifest; proves nothing`);
console.log(`  wall clock         ${String(Math.round((Date.now() - started) / 1000))}s`);

writeJson(`${OUT}/summary.json`, {
  runId: RUN_ID, threads: THREADS, turns: TURNS, workers: WORKERS,
  models: roster.map((m) => m.modelKey),
  totalMessages, totalProbes, totalRecalled, totalViolations, totalUnmeasured, sent, failed,
  wallClockSec: Math.round((Date.now() - started) / 1000),
  perThread: ok,
});
console.log(`\nresults in ${OUT}`);
