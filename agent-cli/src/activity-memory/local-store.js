/**
 * Stream 41 — CLI-side activity-memory local store.
 *
 * Local-first by default per CLAUDE.md hard rule #11. Tiered storage:
 *
 *   1. `@journeyapps/sqlcipher` if installed AND `CLAW_ACTIVITY_PASSPHRASE`
 *      is set — true page-level AES-256 encryption.
 *   2. `better-sqlite3` if installed — plaintext SQLite, dir mode 0700.
 *   3. JSONL fallback (always available) — append-only newline-delimited
 *      JSON at `~/.claw-agent/activity.jsonl`, dir mode 0700.
 *
 * The JSONL fallback keeps activity-memory functional on machines that
 * cannot compile native sqlite (e.g., minimal Windows installs without
 * MSVC build tools). Readers stream the file lazily; writes append-only.
 *
 * The cloud-side mirror (`POST /agent/activity-memory`) only receives
 * rows where `syncedToCloud=true`. Cloud sync is opt-in per record.
 */

import { existsSync, statSync } from 'node:fs';
import { appendFile, chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const DEFAULT_DB_DIR = () => join(homedir(), '.claw-agent');
const SQLITE_PATH = () => join(DEFAULT_DB_DIR(), 'activity.db');
const JSONL_PATH = () => join(DEFAULT_DB_DIR(), 'activity.jsonl');

let backend = null;

async function ensureDir(path) {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true, mode: 0o700 });
  } else {
    try {
      await chmod(path, 0o700);
    } catch {
      /* mode change is best-effort on Windows */
    }
  }
}

async function tryLoad(name) {
  try {
    return await import(name);
  } catch {
    return null;
  }
}

async function buildSqlcipherBackend(passphrase) {
  const sqlcipher = await tryLoad('@journeyapps/sqlcipher');
  if (sqlcipher === null) return null;
  if (typeof passphrase !== 'string' || passphrase.length === 0) return null;
  const Database = sqlcipher.default || sqlcipher;
  await ensureDir(dirname(SQLITE_PATH()));
  const db = new Database(SQLITE_PATH());
  await new Promise((resolve, reject) =>
    db.serialize(() => {
      db.run(
        `PRAGMA key = '${passphrase.replace(/'/g, "''")}'`,
        (err) => (err ? reject(err) : resolve(undefined)),
      );
    }),
  );
  return makeSqlcipherBackend(db);
}

async function buildBetterSqlite3Backend() {
  const better = await tryLoad('better-sqlite3');
  if (better === null) return null;
  const Database = better.default || better;
  await ensureDir(dirname(SQLITE_PATH()));
  const db = new Database(SQLITE_PATH());
  initSqliteSchema(db);
  return makeBetterSqlite3Backend(db);
}

async function buildJsonlBackend() {
  await ensureDir(DEFAULT_DB_DIR());
  return makeJsonlBackend(JSONL_PATH());
}

function initSqliteSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      synced_to_cloud INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_kind ON activity_entries(kind);
    CREATE INDEX IF NOT EXISTS idx_occurred_at ON activity_entries(occurred_at DESC);
  `);
}

function makeBetterSqlite3Backend(db) {
  const insert = db.prepare(
    `INSERT INTO activity_entries (kind, summary, occurred_at, synced_to_cloud, metadata)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const recent = db.prepare(
    `SELECT id, kind, summary, occurred_at, synced_to_cloud, metadata, created_at
     FROM activity_entries ORDER BY occurred_at DESC LIMIT ?`,
  );
  const recentByKind = db.prepare(
    `SELECT id, kind, summary, occurred_at, synced_to_cloud, metadata, created_at
     FROM activity_entries WHERE kind = ? ORDER BY occurred_at DESC LIMIT ?`,
  );
  const unsynced = db.prepare(
    `SELECT id, kind, summary, occurred_at, metadata, created_at
     FROM activity_entries WHERE synced_to_cloud = 0 ORDER BY occurred_at ASC LIMIT ?`,
  );
  return {
    flavor: 'plaintext-sqlite',
    async recordEntry({ kind, summary, occurredAt, syncedToCloud = false, metadata }) {
      const result = insert.run(
        String(kind).slice(0, 60),
        String(summary).slice(0, 2000),
        occurredAt instanceof Date ? occurredAt.toISOString() : String(occurredAt),
        syncedToCloud ? 1 : 0,
        metadata === undefined ? null : JSON.stringify(metadata),
      );
      return { id: result.lastInsertRowid };
    },
    async listRecentEntries({ kind, limit = 50 } = {}) {
      const safe = Math.max(1, Math.min(500, limit));
      return kind === undefined ? recent.all(safe) : recentByKind.all(kind, safe);
    },
    async listUnsynced({ limit = 100 } = {}) {
      return unsynced.all(Math.max(1, Math.min(500, limit)));
    },
    async markSynced(ids) {
      if (ids.length === 0) return { changed: 0 };
      const placeholders = ids.map(() => '?').join(',');
      const stmt = db.prepare(
        `UPDATE activity_entries SET synced_to_cloud = 1 WHERE id IN (${placeholders})`,
      );
      const result = stmt.run(...ids);
      return { changed: result.changes ?? 0 };
    },
    async close() {
      db.close();
    },
  };
}

function makeSqlcipherBackend(db) {
  return {
    flavor: 'sqlcipher',
    async recordEntry({ kind, summary, occurredAt, syncedToCloud = false, metadata }) {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO activity_entries (kind, summary, occurred_at, synced_to_cloud, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [
            String(kind).slice(0, 60),
            String(summary).slice(0, 2000),
            occurredAt instanceof Date ? occurredAt.toISOString() : String(occurredAt),
            syncedToCloud ? 1 : 0,
            metadata === undefined ? null : JSON.stringify(metadata),
          ],
          function callback(err) {
            if (err) reject(err);
            else resolve({ id: this?.lastID ?? 0 });
          },
        );
      });
    },
    async listRecentEntries({ kind, limit = 50 } = {}) {
      const safe = Math.max(1, Math.min(500, limit));
      const sql =
        kind === undefined
          ? `SELECT * FROM activity_entries ORDER BY occurred_at DESC LIMIT ?`
          : `SELECT * FROM activity_entries WHERE kind = ? ORDER BY occurred_at DESC LIMIT ?`;
      const args = kind === undefined ? [safe] : [kind, safe];
      return new Promise((resolve, reject) =>
        db.all(sql, args, (err, rows) => (err ? reject(err) : resolve(rows))),
      );
    },
    async listUnsynced({ limit = 100 } = {}) {
      const safe = Math.max(1, Math.min(500, limit));
      return new Promise((resolve, reject) =>
        db.all(
          `SELECT * FROM activity_entries WHERE synced_to_cloud = 0 ORDER BY occurred_at ASC LIMIT ?`,
          [safe],
          (err, rows) => (err ? reject(err) : resolve(rows)),
        ),
      );
    },
    async markSynced(ids) {
      if (ids.length === 0) return { changed: 0 };
      const placeholders = ids.map(() => '?').join(',');
      return new Promise((resolve, reject) =>
        db.run(
          `UPDATE activity_entries SET synced_to_cloud = 1 WHERE id IN (${placeholders})`,
          ids,
          function callback(err) {
            if (err) reject(err);
            else resolve({ changed: this?.changes ?? 0 });
          },
        ),
      );
    },
    async close() {
      return new Promise((resolve) => db.close(() => resolve(undefined)));
    },
  };
}

function makeJsonlBackend(path) {
  let nextId = 0;
  if (existsSync(path)) {
    try {
      const s = statSync(path);
      if (s.size > 0) nextId = Date.now();
    } catch {
      /* ignore */
    }
  }

  async function readAll() {
    if (!existsSync(path)) return [];
    const raw = await readFile(path, 'utf8');
    const lines = raw.split('\n').filter((l) => l.length > 0);
    const out = [];
    for (const line of lines) {
      try {
        out.push(JSON.parse(line));
      } catch {
        /* skip corrupted line */
      }
    }
    return out;
  }

  return {
    flavor: 'jsonl',
    async recordEntry({ kind, summary, occurredAt, syncedToCloud = false, metadata }) {
      const id = ++nextId;
      const row = {
        id,
        kind: String(kind).slice(0, 60),
        summary: String(summary).slice(0, 2000),
        occurred_at: occurredAt instanceof Date ? occurredAt.toISOString() : String(occurredAt),
        synced_to_cloud: syncedToCloud ? 1 : 0,
        metadata: metadata === undefined ? null : JSON.stringify(metadata),
        created_at: new Date().toISOString(),
      };
      await appendFile(path, `${JSON.stringify(row)}\n`, 'utf8');
      return { id };
    },
    async listRecentEntries({ kind, limit = 50 } = {}) {
      const all = await readAll();
      const filtered = kind === undefined ? all : all.filter((r) => r.kind === kind);
      return filtered
        .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
        .slice(0, Math.max(1, Math.min(500, limit)));
    },
    async listUnsynced({ limit = 100 } = {}) {
      const all = await readAll();
      return all
        .filter((r) => r.synced_to_cloud === 0)
        .sort((a, b) => (a.occurred_at > b.occurred_at ? 1 : -1))
        .slice(0, Math.max(1, Math.min(500, limit)));
    },
    async markSynced(ids) {
      if (ids.length === 0) return { changed: 0 };
      const all = await readAll();
      const idSet = new Set(ids);
      let changed = 0;
      for (const r of all) {
        if (idSet.has(r.id) && r.synced_to_cloud === 0) {
          r.synced_to_cloud = 1;
          changed += 1;
        }
      }
      const tmp = `${path}.tmp`;
      await writeFile(tmp, all.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
      await rename(tmp, path);
      return { changed };
    },
    async close() {
      /* nothing to close */
    },
  };
}

async function getBackend() {
  if (backend !== null) return backend;
  const passphrase = process.env.CLAW_ACTIVITY_PASSPHRASE;
  backend =
    (await buildSqlcipherBackend(passphrase)) ??
    (await buildBetterSqlite3Backend()) ??
    (await buildJsonlBackend());
  if (backend.flavor === 'jsonl') {
    console.warn(
      'ActivityMemory: using plain JSONL fallback (no encrypted SQLite available). ' +
        'Install @journeyapps/sqlcipher + set CLAW_ACTIVITY_PASSPHRASE for at-rest encryption.',
    );
  }
  return backend;
}

export async function recordEntry(args) {
  return (await getBackend()).recordEntry(args);
}
export async function listRecentEntries(args = {}) {
  return (await getBackend()).listRecentEntries(args);
}
export async function listUnsynced(args = {}) {
  return (await getBackend()).listUnsynced(args);
}
export async function markSynced(ids) {
  return (await getBackend()).markSynced(ids);
}
export async function getFlavor() {
  return (await getBackend()).flavor;
}
export async function close() {
  if (backend === null) return;
  await backend.close();
  backend = null;
}
