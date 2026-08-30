// Conversational-context QA lab runner.
//
//   node run-lab.mjs --label BASELINE --workers 6 [--models all|smoke] [--suite full|breadth]
//
// Only PAYG-exempt providers can execute; client.mjs refuses anything else.
import {
  login,
  loadAllowedModels,
  createThread,
  sendMessage,
  awaitAssistant,
  listAllMessages,
  getReceipt,
  appendJsonl,
  writeJson,
  pool,
  sleep,
} from './client.mjs';
import { contextGauntlet, topicReturn, shortRecall, crossThread, scoreProbe } from './scenarios.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? 'true' : arr[i + 1] ?? 'true']);
    return acc;
  }, []),
);

const LABEL = args.label ?? 'RUN';
const WORKERS = Number(args.workers ?? 6);
const SUITE = args.suite ?? 'full';
const RUN_ID = `${LABEL}-${Date.now().toString(36)}`;
const OUT = `./results/${RUN_ID}`;
const TURNS_JSONL = `${OUT}/turns.jsonl`;
const PROBES_JSONL = `${OUT}/probes.jsonl`;

const stats = { turnsSent: 0, turnsOk: 0, turnsFailed: 0, probes: 0, probesPassed: 0 };

function log(line) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${line}\n`);
}

/** Runs one scripted thread. `modelFor(turnIndex)` allows mid-thread switching. */
async function runThread({ scenario, threadLabel, modelFor, maxTokens }) {
  const first = modelFor(0);
  const thread = await createThread({
    title: `QA-LAB-${RUN_ID}-${threadLabel}`,
    provider: first.provider,
    model: first.modelKey,
    ...(maxTokens === undefined ? {} : { maxTokens }),
  });
  const captured = {};
  const probes = [];
  let count = 0;

  for (const [index, turn] of scenario.turns.entries()) {
    const model = modelFor(index);
    const t0 = Date.now();
    const sent = await sendMessage(thread.id, turn.content, model.provider, model.modelKey);
    stats.turnsSent += 1;
    if (!sent.ok) {
      stats.turnsFailed += 1;
      appendJsonl(TURNS_JSONL, {
        runId: RUN_ID, threadId: thread.id, threadLabel, index, kind: turn.kind,
        model: model.modelKey, ok: false, status: sent.status, error: sent.body,
      });
      continue;
    }
    count += 1;
    const reply = await awaitAssistant(thread.id, count, { timeoutMs: 300_000 });
    if (!reply.ok) {
      stats.turnsFailed += 1;
      appendJsonl(TURNS_JSONL, {
        runId: RUN_ID, threadId: thread.id, threadLabel, index, kind: turn.kind,
        model: model.modelKey, ok: false, reason: reply.reason, waitedMs: reply.waitedMs,
      });
      count += 1; // the user row still landed; keep the counter honest
      continue;
    }
    count = reply.total;
    stats.turnsOk += 1;
    const answer = String(reply.message.content ?? '');

    if (turn.captureAs && turn.capturePattern) {
      const match = turn.capturePattern.exec(answer);
      if (match) captured[turn.captureAs] = match[1] ?? match[0];
    }

    appendJsonl(TURNS_JSONL, {
      runId: RUN_ID, threadId: thread.id, threadLabel, index, kind: turn.kind,
      model: model.modelKey, ok: true, latencyMs: Date.now() - t0, totalMessages: count,
      promptChars: turn.content.length, answerChars: answer.length,
      answeredModel: reply.message.model ?? null, answeredProvider: reply.message.provider ?? null,
    });

    if (turn.kind === 'probe') {
      const score = scoreProbe(turn, answer, captured);
      const receipt = await getReceipt(reply.message.id);
      const row = {
        runId: RUN_ID, threadId: thread.id, threadLabel, scenario: scenario.id,
        model: model.modelKey, provider: model.provider, turnIndex: index,
        threadMessagesAtProbe: count, captured: { ...captured },
        receiptPresent: receipt !== null,
        receiptMemoryCount: receipt?.memories?.length ?? null,
        tokenBudget: receipt?.tokenBudget ?? null,
        ...score,
      };
      appendJsonl(PROBES_JSONL, row);
      probes.push(row);
      stats.probes += 1;
      if (score.pass) stats.probesPassed += 1;
      log(`  ${threadLabel} ${score.pass ? 'PASS' : 'FAIL'} ${turn.id} (d=${turn.distance}, msgs=${count}, ${model.modelKey}) ${score.hits}/${score.total}`);
    }
    await sleep(150);
  }

  const finalMessages = await listAllMessages(thread.id);
  return { threadId: thread.id, threadLabel, scenario: scenario.id, probes, messageCount: finalMessages.length, captured };
}

// ---------------------------------------------------------------------- main

const user = await login();
const allModels = await loadAllowedModels();
log(`login ${user.email} — ${allModels.length} PAYG-exempt models`);

const modelsByKey = new Map(allModels.map((m) => [m.modelKey, m]));
const HEADLINE = [
  'kimi-k3', 'kimi-k2.6', 'deepseek-v4-pro:0813', 'deepseek-v4-flash:0731',
  'glm-5.2', 'glm-5.3', 'qwen3.5:397b', 'gpt-oss:120b', 'gpt-oss:20b',
  'minimax-m3', 'nemotron-3-super', 'mistral-large-3:675b', 'gemma4:31b',
].map((k) => modelsByKey.get(k)).filter(Boolean);

const jobs = [];

if (SUITE === 'full') {
  // 1. The gauntlet, once per headline model — stable model for the whole thread.
  for (const model of HEADLINE) {
    jobs.push({
      scenario: contextGauntlet(),
      threadLabel: `gauntlet-${model.modelKey.replace(/[^a-z0-9]/gi, '')}`,
      modelFor: () => model,
    });
  }
  // 2. Model-switch continuity: rotate every 10 turns, and every single turn.
  const rota = HEADLINE.slice(0, 6);
  jobs.push({
    scenario: contextGauntlet(),
    threadLabel: 'gauntlet-switch10',
    modelFor: (i) => rota[Math.floor(i / 10) % rota.length],
  });
  jobs.push({
    scenario: contextGauntlet(),
    threadLabel: 'gauntlet-switch1',
    modelFor: (i) => rota[i % rota.length],
  });
  // 3. Token-budget probe: identical scenario, maxTokens raised to the cap.
  jobs.push({
    scenario: contextGauntlet(),
    threadLabel: 'gauntlet-maxtokens32k',
    modelFor: () => modelsByKey.get('kimi-k3') ?? HEADLINE[0],
    maxTokens: 32000,
  });
  // 4. Topic return, three models.
  for (const model of HEADLINE.slice(0, 3)) {
    jobs.push({
      scenario: topicReturn(),
      threadLabel: `topicreturn-${model.modelKey.replace(/[^a-z0-9]/gi, '')}`,
      modelFor: () => model,
    });
  }
}

// 5. Breadth: the cheap short-recall scenario across EVERY free model.
for (const model of allModels) {
  jobs.push({
    scenario: shortRecall(),
    threadLabel: `shortrecall-${model.modelKey.replace(/[^a-z0-9]/gi, '')}`,
    modelFor: () => model,
  });
}

log(`queued ${jobs.length} threads, ${jobs.reduce((n, j) => n + j.scenario.turns.length, 0)} turns, ${WORKERS} workers`);

const started = Date.now();
const threadResults = await pool(jobs, WORKERS, async (job) => {
  log(`start ${job.threadLabel}`);
  const result = await runThread(job);
  log(`done  ${job.threadLabel} (${result.messageCount} msgs, ${result.probes.length} probes)`);
  return result;
});

// 6. Cross-thread, run after the rest so the seed threads exist.
const xModel = modelsByKey.get('kimi-k3') ?? allModels[0];
const seedThread = await runThread({
  scenario: { id: 'cross-thread-seed', turns: crossThread.seedTurns },
  threadLabel: 'crossthread-seed',
  modelFor: () => xModel,
});
const probeThread = await runThread({
  scenario: { id: 'cross-thread-probe', turns: [...crossThread.probeTurns, ...crossThread.leakProbeTurns] },
  threadLabel: 'crossthread-probe',
  modelFor: () => xModel,
});

const summary = {
  runId: RUN_ID,
  label: LABEL,
  startedAt: new Date(started).toISOString(),
  durationMs: Date.now() - started,
  models: allModels.map((m) => ({ key: m.modelKey, ctx: m.contextWindowTokens })),
  stats,
  threads: [...threadResults, seedThread, probeThread].map((r) => ({
    threadId: r?.threadId, label: r?.threadLabel, scenario: r?.scenario,
    messages: r?.messageCount, probes: r?.probes?.length, error: r?.error,
  })),
};
writeJson(`${OUT}/summary.json`, summary);
log(`\nRUN ${RUN_ID} complete in ${Math.round(summary.durationMs / 1000)}s`);
log(`turns sent=${stats.turnsSent} ok=${stats.turnsOk} failed=${stats.turnsFailed}`);
log(`probes ${stats.probesPassed}/${stats.probes} passed`);
log(`results in ${OUT}`);
