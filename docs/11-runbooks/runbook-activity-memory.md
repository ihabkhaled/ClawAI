# Runbook — Activity Memory (Stream 41)

Two halves:
- **Cloud-side**: `apps/claw-agent-service/src/modules/activity-memory/` — receives opt-in synced entries
- **CLI-side**: `agent-cli/src/activity-memory/local-store.js` — three-tiered local store

## Local-first architecture

Per CLAUDE.md hard rule #11, activity entries default to local-only. The CLI store persists entries in a tiered backend (in order of preference):

1. **`@journeyapps/sqlcipher`** — encrypted at-rest SQLite. Requires `CLAW_ACTIVITY_PASSPHRASE` env var. Currently darwin/linux only (Windows incompatible).
2. **`better-sqlite3`** — plaintext SQLite, dir mode 0700.
3. **JSONL fallback** — append-only `~/.claw-agent/activity.jsonl`. Always works; no native deps.

The CLI capability-runner records every executed invocation as an activity entry with `syncedToCloud=false` by default. The user explicitly opts entries in to cloud sync via the frontend (planned in `/agent/activity-memory`).

## Cloud endpoint

```
POST /api/v1/agent/activity-memory
GET  /api/v1/agent/activity-memory?page=1&pageSize=50&kind=...
```

Backend stores rows in `activity_memory_entries` (Postgres). Only opt-in rows from the CLI ever land here.

## Common operational issues

### "Activity store reports flavor=jsonl"

This is the default fallback. To upgrade:

```bash
# Plaintext SQLite (dir-permission protected):
npm i better-sqlite3 -w agent-cli

# Encrypted at rest (macOS / Linux only):
npm i @journeyapps/sqlcipher -w agent-cli
export CLAW_ACTIVITY_PASSPHRASE="<strong passphrase>"
```

### "Activity entries not appearing in cloud /agent/activity-memory"

Sync is opt-in per record. Check:
1. The CLI's `recordEntry({syncedToCloud: true, ...})` flag is set
2. The cloud-sync uploader is running (planned: `agent-cli/src/runtime/activity-sync.js`)
3. Network reachability from CLI to cloud API

### "How do I prove zero-outbound?"

The local-first guarantee can be verified with `tcpdump`:

```bash
# Linux / macOS — run agent-cli, then:
sudo tcpdump -i any -n 'host <cloud-host> and not port 22' &
# Trigger capability invocations on the agent
# Stop tcpdump after a few minutes
```

Expected: zero packets to the cloud host while invocations run, **unless** specific entries are flagged `syncedToCloud=true`.

## Health checks

```bash
# CLI-side: how many entries pending sync?
node -e "
import('./agent-cli/src/activity-memory/local-store.js').then(async (s) => {
  const pending = await s.listUnsynced({ limit: 1000 });
  console.log('Pending sync:', pending.length);
  console.log('Backend:', await s.getFlavor());
});
"

# Cloud-side: today's synced entries
docker exec claw-pg-agent psql -U claw -d claw_agent -tAc \
  "SELECT kind, COUNT(*) FROM activity_memory_entries \
   WHERE \"createdAt\" > NOW() - INTERVAL '1 day' GROUP BY kind;"
```

## Related documents

- [Capability Framework Runbook](runbook-capability-framework.md)
