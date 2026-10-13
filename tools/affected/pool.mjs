// Bounded parallel task runner for the affected gates. Each task's output is
// captured and printed as one block when it finishes, so parallel workspaces
// never interleave; a pass/fail table with per-task timings closes the run.
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';

/**
 * Pool size: half the cores (the other half keeps the machine usable), at least
 * one. CLAW_GATE_JOBS overrides it — `CLAW_GATE_JOBS=1` restores serial runs.
 */
export function gateJobs(env = process.env, cores = availableParallelism()) {
  const override = Number.parseInt(env.CLAW_GATE_JOBS ?? '', 10);
  if (Number.isInteger(override) && override > 0) return override;
  return Math.max(1, Math.floor(cores / 2));
}

function runTask(task) {
  return new Promise((resolve) => {
    const started = performance.now();
    const chunks = [];
    const child = spawn(task.command, task.args, {
      ...task.options,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => chunks.push(chunk));
    const finish = (code, error) =>
      resolve({
        name: task.name,
        ok: code === 0,
        code,
        seconds: (performance.now() - started) / 1000,
        output: Buffer.concat(chunks).toString('utf8') + (error ? `\n${error.message}\n` : ''),
      });
    child.on('error', (error) => finish(1, error));
    child.on('close', (code) => finish(code ?? 1));
  });
}

/** Run tasks with at most `jobs` in flight. Resolves to results in task order. */
export async function runPool(tasks, { jobs = gateJobs(), write = (s) => process.stdout.write(s) } = {}) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      const result = await runTask(tasks[index]);
      results[index] = result;
      write(`\n${result.ok ? '✔' : '✖'} ${result.name} (${result.seconds.toFixed(1)}s)\n${result.output}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, () => worker()));
  return results;
}

/** The closing summary table. */
export function formatSummary(results) {
  const width = Math.max(9, ...results.map((r) => r.name.length));
  const lines = [`${'workspace'.padEnd(width)}  result  seconds`];
  for (const r of results) {
    lines.push(`${r.name.padEnd(width)}  ${r.ok ? 'pass  ' : 'FAIL  '}  ${r.seconds.toFixed(1).padStart(7)}`);
  }
  return `${lines.join('\n')}\n`;
}
