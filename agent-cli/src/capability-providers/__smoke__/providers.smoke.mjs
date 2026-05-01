#!/usr/bin/env node
/**
 * Capability provider smoke test (host-side, no jest needed).
 *
 * Usage: node agent-cli/src/capability-providers/__smoke__/providers.smoke.mjs
 *
 * Each block exercises a happy path + an error path against a tmp dir.
 * Exit code 0 = all passed; non-zero = something failed.
 */

import { mkdtemp, rm, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';

import { providerRegistry } from '../index.js';

let pass = 0;
let fail = 0;
const failures = [];

function ok(name) {
  pass += 1;
  console.log(`  ✔ ${name}`);
}
function bad(name, err) {
  fail += 1;
  failures.push(`${name}: ${err?.message ?? err}`);
  console.log(`  ✖ ${name} — ${err?.message ?? err}`);
}

async function expect(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    bad(name, e);
  }
}

async function expectThrow(name, fn) {
  try {
    await fn();
    bad(name, 'expected throw, got nothing');
  } catch (e) {
    ok(`${name} (threw: ${e?.message ?? 'err'})`);
  }
}

async function main() {
  const fs = providerRegistry.get('FILESYSTEM');
  const proc = providerRegistry.get('PROCESS');
  if (fs === undefined) throw new Error('FILESYSTEM provider not registered');
  if (proc === undefined) throw new Error('PROCESS provider not registered');
  ok('FILESYSTEM + PROCESS providers registered');

  const tmp = await mkdtemp(join(tmpdir(), 'claw-cap-smoke-'));
  const fileA = join(tmp, 'a.txt');
  const fileB = join(tmp, 'b.txt');

  // ===== FILESYSTEM =====
  console.log('\n[FILESYSTEM]');

  await expectThrow('FS rejects non-absolute path', () =>
    fs.execute({ operation: 'WRITE', target: { path: 'rel/path.txt' }, payload: { content: 'x' } }),
  );
  await expectThrow('FS rejects path traversal', () =>
    // Plain concat — path.join would normalise away the `..` and hide the test
    fs.execute({
      operation: 'WRITE',
      target: { path: `${tmp}/../evil.txt` },
      payload: { content: 'x' },
    }),
  );

  await expect('FS WRITE creates new file with DELETE undoPlan', async () => {
    const r = await fs.execute({
      operation: 'WRITE',
      target: { path: fileA },
      payload: { content: 'hello' },
    });
    if (r.output.bytesWritten !== 5) throw new Error('bytesWritten wrong');
    if (r.output.replacedExisting !== false) throw new Error('replacedExisting wrong');
    if (r.undoPlan?.steps?.[0]?.capabilityOperation !== 'DELETE') throw new Error('undoPlan wrong');
    if ((await stat(fileA)).size !== 5) throw new Error('file not on disk');
  });

  await expect('FS READ returns content + sha256', async () => {
    const r = await fs.execute({ operation: 'READ', target: { path: fileA }, payload: {} });
    if (r.output.size !== 5) throw new Error('size wrong');
    if (Buffer.from(r.output.contentBase64, 'base64').toString('utf8') !== 'hello')
      throw new Error('content wrong');
    if (typeof r.output.sha256 !== 'string' || r.output.sha256.length !== 64)
      throw new Error('sha256 wrong');
    if (r.noUndoReason !== 'read_only_no_state_change') throw new Error('noUndoReason wrong');
  });

  await expect('FS WRITE replacing existing captures original into undoPlan', async () => {
    const r = await fs.execute({
      operation: 'WRITE',
      target: { path: fileA },
      payload: { content: 'world' },
    });
    if (r.output.replacedExisting !== true) throw new Error('replacedExisting wrong');
    const restoreContent = Buffer.from(
      r.undoPlan.steps[0].payload.contentBase64,
      'base64',
    ).toString('utf8');
    if (restoreContent !== 'hello') throw new Error('undo content wrong');
  });

  await expect('FS APPEND grows file + records original size for undo', async () => {
    const r = await fs.execute({
      operation: 'APPEND',
      target: { path: fileA },
      payload: { content: '!' },
    });
    if (r.output.bytesAppended !== 1) throw new Error('bytesAppended wrong');
    if (r.undoPlan.steps[0].payload.toSize !== 5) throw new Error('toSize wrong');
    const buf = await readFile(fileA);
    if (buf.toString('utf8') !== 'world!') throw new Error('content wrong');
  });

  await expect('FS LIST returns directory entries', async () => {
    const r = await fs.execute({ operation: 'LIST', target: { path: tmp }, payload: {} });
    if (!Array.isArray(r.output.entries) || r.output.entries.length === 0)
      throw new Error('list empty');
    if (!r.output.entries.some((e) => e.name === 'a.txt' && e.kind === 'FILE'))
      throw new Error('a.txt missing');
  });

  await expect('FS STAT returns metadata', async () => {
    const r = await fs.execute({ operation: 'STAT', target: { path: fileA }, payload: {} });
    if (r.output.isFile !== true) throw new Error('isFile wrong');
    if (r.output.size !== 6) throw new Error('size wrong');
  });

  await expect('FS COPY duplicates file with delete undoPlan', async () => {
    const r = await fs.execute({
      operation: 'COPY',
      target: { path: fileA, toPath: fileB },
      payload: {},
    });
    if (r.undoPlan.steps[0].capabilityOperation !== 'DELETE') throw new Error('undoPlan wrong');
    if ((await stat(fileB)).size !== 6) throw new Error('copy missing');
  });

  await expect('FS DELETE removes file with restore undoPlan', async () => {
    const r = await fs.execute({ operation: 'DELETE', target: { path: fileB }, payload: {} });
    if (r.output.deleted !== fileB) throw new Error('deleted path wrong');
    if (r.undoPlan?.steps?.[0]?.capabilityOperation !== 'WRITE')
      throw new Error('undo not WRITE');
  });

  // ===== PROCESS =====
  console.log('\n[PROCESS]');

  await expectThrow('PROCESS.SPAWN rejects non-absolute binary', () =>
    proc.execute({
      operation: 'SPAWN',
      target: { binary: 'node', args: ['-v'] },
      payload: {},
    }),
  );

  await expect('PROCESS.LIST returns at least 1 process', async () => {
    const r = await proc.execute({ operation: 'LIST', target: {}, payload: {} });
    if (!Array.isArray(r.output.processes) || r.output.processes.length < 1)
      throw new Error('empty list');
    if (typeof r.output.processes[0].pid !== 'number') throw new Error('no pid');
  });

  await expect('PROCESS.LIST filters by binaryNameRegex', async () => {
    const r = await proc.execute({
      operation: 'LIST',
      target: { binaryNameRegex: '^(node|System)' },
      payload: {},
    });
    if (!Array.isArray(r.output.processes)) throw new Error('not array');
  });

  await expect('PROCESS.INSPECT for self pid returns metadata', async () => {
    const r = await proc.execute({
      operation: 'INSPECT',
      target: { pid: process.pid },
      payload: {},
    });
    if (r.output.found !== true) throw new Error('self pid not found');
    if (r.output.pid !== process.pid) throw new Error('pid mismatch');
  });

  await expectThrow('PROCESS.KILL rejects bogus pid', () =>
    proc.execute({ operation: 'KILL', target: { pid: 0 }, payload: {} }),
  );

  await expectThrow('PROCESS.KILL rejects forbidden signal', () =>
    proc.execute({
      operation: 'KILL',
      target: { pid: process.pid },
      payload: { signal: 'SIGABRT' },
    }),
  );

  // Cleanup
  await rm(tmp, { recursive: true, force: true });

  console.log(`\nPassed: ${pass}\nFailed: ${fail}`);
  if (fail > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
