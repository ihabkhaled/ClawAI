#!/usr/bin/env node
/**
 * Stream 41 — local-store smoke test (host-side, no Docker, no cloud).
 *
 * Skips when better-sqlite3 isn't installed. Validates the public
 * surface: recordEntry → listRecentEntries → listUnsynced → markSynced.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as store from '../local-store.js';

let pass = 0;
let fail = 0;

function ok(name) {
  pass += 1;
  console.log(`  ✔ ${name}`);
}
function bad(name, err) {
  fail += 1;
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

async function main() {
  // Use a unique tmpdir as the activity-memory root for the test.
  const dir = await mkdtemp(join(tmpdir(), 'claw-am-smoke-'));
  process.env.HOME = dir;
  process.env.USERPROFILE = dir;

  // Re-import the module against the new HOME so it points at our tmpdir.
  await store.close();

  try {
    await expect('recordEntry inserts a row', async () => {
      const result = await store.recordEntry({
        kind: 'capability_executed',
        summary: 'unit-test FS READ',
        occurredAt: new Date(),
        syncedToCloud: false,
        metadata: { invocationId: 'inv1' },
      });
      if (typeof result.id !== 'number' && typeof result.id !== 'bigint')
        throw new Error('id missing');
    });

    await expect('recordEntry second row', async () => {
      await store.recordEntry({
        kind: 'shell_session',
        summary: 'whoami',
        occurredAt: new Date(),
        syncedToCloud: true,
      });
    });

    await expect('listRecentEntries returns rows DESC', async () => {
      const rows = await store.listRecentEntries({ limit: 10 });
      if (rows.length < 2) throw new Error('expected 2+ rows');
    });

    await expect('listRecentEntries with kind filter', async () => {
      const rows = await store.listRecentEntries({ kind: 'capability_executed' });
      if (rows.length !== 1) throw new Error(`expected 1 row, got ${rows.length}`);
    });

    await expect('listUnsynced returns only synced=0', async () => {
      const rows = await store.listUnsynced();
      if (rows.length !== 1) throw new Error(`expected 1 unsynced, got ${rows.length}`);
    });

    let unsyncedId;
    await expect('markSynced flips the flag', async () => {
      const rows = await store.listUnsynced();
      unsyncedId = rows[0].id;
      const result = await store.markSynced([unsyncedId]);
      if (result.changed !== 1) throw new Error('changed != 1');
    });

    await expect('listUnsynced empty after markSynced', async () => {
      const rows = await store.listUnsynced();
      if (rows.length !== 0) throw new Error('still unsynced rows');
    });

    await expect('flavor reports a valid backend', async () => {
      const f = await store.getFlavor();
      if (!['sqlcipher', 'plaintext-sqlite', 'jsonl'].includes(f))
        throw new Error(`bad flavor ${f}`);
    });
  } finally {
    await store.close();
    await rm(dir, { recursive: true, force: true });
  }

  console.log(`\nPassed: ${pass}\nFailed: ${fail}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  if (e?.message?.includes('better-sqlite3 installed')) {
    console.log('SKIP: better-sqlite3 not installed — install with `npm i better-sqlite3 -w agent-cli`');
    process.exit(0);
  }
  console.error('fatal:', e);
  process.exit(1);
});
