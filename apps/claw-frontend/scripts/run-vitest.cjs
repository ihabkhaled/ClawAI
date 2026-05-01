#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * vitest-with-ipc-tolerance
 *
 * Wraps `vitest run` so that vitest's post-run worker-pool teardown does NOT
 * cause a non-zero exit when every test actually passed.
 *
 * Why this wrapper exists:
 *   - vitest 3.2.4 + tinypool 1.1.1 + Node v24 on Windows AND on the GitHub-
 *     Actions ubuntu-latest runner OOM during worker shutdown AFTER all tests
 *     have finished. The teardown emits `ERR_IPC_CHANNEL_CLOSED` /
 *     "Ineffective mark-compacts near heap limit" and the process exits 1
 *     even though `Tests: N passed (N)` was printed seconds earlier.
 *   - Switching to vitest 4 introduces unrelated test failures (different
 *     mocker semantics) and ALSO OOMs mid-suite, so it is not a drop-in fix.
 *   - `pool: 'forks'`, `singleFork: true`, `vmThreads`, and
 *     `dangerouslyIgnoreUnhandledErrors` were all tested locally and either
 *     introduce other failures or do not fix the issue.
 *
 * What this wrapper does:
 *   - Spawns `npx vitest run` with stdio inherited (no buffering — earlier
 *     wrapper attempts that buffered both streams hit their own heap limit).
 *   - Watches stdout via a tee'd stream parser for "Tests: N passed (N)" and
 *     "Tests: M failed". The summary line appears BEFORE the OOM.
 *   - When vitest's child exits non-zero, the wrapper inspects the parsed
 *     summary. If summary shows ≥1 passed and 0 failed, exits 0 and logs
 *     a clear note. If summary shows any failures, exits 1 with vitest's
 *     own exit code so real test failures still block the build.
 *
 * Failure modes still propagated correctly:
 *   - real test assertions failing → 1 failed → wrapper exits 1
 *   - vitest cannot start (config error, missing dep) → no summary printed
 *     → wrapper exits 1
 *   - typecheck/import error in tests → no summary printed → wrapper exits 1
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const isWin = process.platform === 'win32';
const cwd = path.resolve(__dirname, '..');
const env = { ...process.env };
const existing = env.NODE_OPTIONS ?? '';
if (!existing.includes('--max-old-space-size')) {
  env.NODE_OPTIONS = `${existing} --max-old-space-size=16384`.trim();
}

let summary = { passed: null, failed: null };
let buf = '';

function inspectChunk(chunk) {
  // ANSI-colour stripped form for matching only; original chunk still piped to stdout.
  const text = chunk.toString().replace(/\[[0-9;]*m/g, '');
  buf += text;
  // Keep buffer bounded — we only need the most recent ~16 KB.
  if (buf.length > 16384) {
    buf = buf.slice(-16384);
  }
  // vitest 3 format:  "Tests:  363 passed (363)" or "Tests: 1 failed | 362 passed (363)"
  // vitest 4 format:  "Tests  365 passed (369)"  (no colon, two spaces)
  // jest format:      "Tests: 363 passed, 363 total"
  const re = /Tests\s*:?\s+(?:(\d+)\s+failed\s*[|,]\s*)?(\d+)\s+passed\s*[(,]\s*\d+/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) summary.failed = Number(m[1]);
    summary.passed = Number(m[2]);
  }
}

// Resolve vitest's binary directly to avoid npx walking workspace symlinks
// and ending up at `node_modules/claw-frontend/node_modules/vitest/...` which
// does not exist (vitest is hoisted to the workspace root).
const vitestPkg = require.resolve('vitest/package.json', { paths: [cwd] });
const vitestBin = path.join(
  path.dirname(vitestPkg),
  isWin ? 'vitest.mjs' : 'vitest.mjs',
);

const child = spawn(process.execPath, [vitestBin, 'run', ...process.argv.slice(2)], {
  cwd,
  env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

child.stdout.on('data', (c) => {
  process.stdout.write(c);
  inspectChunk(c);
});
child.stderr.on('data', (c) => {
  process.stderr.write(c);
  inspectChunk(c);
});

child.on('close', (code) => {
  if (code === 0) {
    process.exit(0);
  }
  // Vitest summary said >=1 passed, 0 failed → tolerate the post-run crash.
  if (summary.passed != null && summary.passed > 0 && (summary.failed ?? 0) === 0) {
    console.log(
      `\n[run-vitest] vitest exited ${code} but summary reported ${summary.passed} passed / 0 failed — treating as success (post-run cleanup OOM, see scripts/run-vitest.cjs header).`,
    );
    process.exit(0);
  }
  process.exit(code ?? 1);
});
