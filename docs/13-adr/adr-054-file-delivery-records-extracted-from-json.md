# ADR-054: Extract `file_delivery_records` from `ChatMessage.metadata` JSON

**Status**: Accepted
**Date**: 2026-05-31
**Deciders**: ClawAI core team
**Slice**: D foundation 1 (compare/judge/critic file attachments close-out)

## Context

Slice A of the compare/judge/critic file-attachments work shipped
per-model file delivery telemetry into `ChatMessage.metadata.fileDelivery`
as a `FileDeliveryEntry[]` array on the existing JSON column. The shape:

```typescript
{
  fileId: string;
  filename: string;
  mimeType: string;
  deliveryMode:
    | 'NATIVE_IMAGE'
    | 'EXTRACTED_TEXT'
    | 'OMITTED_NO_VISION'
    | 'OMITTED_UNSUPPORTED'
    | 'TRUNCATED_TEXT'
    | 'NATIVE_PDF';        // Slice D
  bytes: number;
  warnings?: string[];
}
```

Inline JSON was deliberately chosen for Slice A so the shape could
iterate without database migrations while the compare/judge/critic
contract was still in flux. The shape has now stabilised:

1. Slice B added `NATIVE_IMAGE` / `OMITTED_NO_VISION` / `OMITTED_UNSUPPORTED`.
2. Slice C added the file-RBAC plus retention checks (no shape change).
3. Slice D adds `NATIVE_PDF` and optional `lowConfidenceOcr` boolean.

No new modes are planned. The shape is final enough to migrate to a
typed table.

Inline JSON is hurting two dominant query patterns observed in
production telemetry:

1. **"Show me every message that received file X."** Today this is a
   sequential scan with `metadata->'fileDelivery' @> '[{"fileId":"X"}]'`
   across the entire `ChatMessage` table (~6.4 GB on the 90-day soak
   install). p99 latency is ~3.1 s. Used by the admin file-usage
   dashboard and by the upcoming "delete file → blank-out every
   compare answer that quoted it" GDPR flow.
2. **"Show me every model that ever received file Y as NATIVE_IMAGE."**
   Same scan, plus the JSON `@>` is even less selective. The retention
   sweeper needs this to know if it can hard-delete the blob or has to
   keep it for the audit trail. Currently ~5.8 s p99.

Neither query benefits from `gin (metadata jsonb_path_ops)` because
the query shape is "fileId match plus deliveryMode match" — gin sees
the inner array as a single document.

## Decision

Extract `FileDeliveryEntry` into a dedicated `file_delivery_records`
Postgres table on `claw-chat-service`, with proper foreign keys and
indexes for the dominant queries. Keep the JSON column for a
30-day dual-write window so existing readers see no change.

### Schema

```prisma
model FileDeliveryRecord {
  id           String              @id @default(cuid())
  messageId    String
  threadId     String
  fileId       String
  filename     String
  mimeType     String
  deliveryMode FileDeliveryMode
  bytes        Int
  modelKey     String              // provider+model so we can answer "which model received X"
  provider     String
  warnings     String[]            @default([])
  metadata     Json?               // future: lowConfidenceOcr, ocrConfidence, etc.
  createdAt    DateTime            @default(now())

  message      ChatMessage         @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId])
  @@index([fileId])
  @@index([threadId])
  @@index([fileId, deliveryMode])   // partial index in the migration:
                                    //   WHERE deliveryMode = 'NATIVE_IMAGE'
  @@map("file_delivery_records")
}
```

### Dual-write window

For the first 30 days after rollout:

1. **Writes**: chat-service writes the new table AND the legacy JSON
   column on every assistant message. Same data, same shape. A drift
   checker runs hourly and emits `slice-d.delivery_records.drift` to
   `server-logs` if the two diverge for any message. Divergence = bug,
   triage immediately.
2. **Reads**: legacy JSON column is still the source of truth. FE,
   admin dashboards, and the audit-service consumer all read from JSON.
3. **Backfill**: a one-shot migration backfills the table from existing
   JSON rows. The backfill is idempotent and re-runnable (`ON CONFLICT
DO NOTHING` on `(messageId, fileId, modelKey)`). On the 90-day soak
   install the backfill takes ~14 minutes for ~3.6 M records.

After 30 consecutive days of zero drift events:

4. Flip the read path. FE, admin dashboards, retention sweeper switch
   to the table. JSON column becomes write-only.
5. Wait one more release cycle (catches any forgotten reader).
6. Drop the JSON column in a follow-up migration. The
   `metadata.fileDelivery` key becomes a hard error in chat-service.

### Why dual-write instead of single cutover

Three reasons:

1. **Read consumers are spread across services.** audit-service consumes
   `message.completed` events and reads `metadata.fileDelivery` to
   record per-file delivery in its own MongoDB. Cutting over chat
   without coordinating audit risks losing the delivery audit trail.
2. **Admin / debug surfaces.** The `/admin/file-usage` page and the
   compare-debug panel both read JSON today. Migrating them needs FE
   review and i18n updates; we'd rather not couple that to the
   schema change.
3. **Rollback.** If the new table has a subtle bug (e.g., partial
   index missing on prod), JSON is still authoritative. We can fix
   the migration and re-backfill without losing data or breaking
   readers.

### Why a table, not a materialised view

A materialised view over the JSON column would deliver the same
query speed-up without a write-side change. Rejected because:

1. Postgres materialised views do not refresh incrementally — the
   refresh is a full re-scan, exactly the cost we're trying to
   avoid.
2. Triggers + a base table would work but the trigger logic
   (parse JSON, upsert rows) is itself a code path that needs
   testing. We may as well write the rows directly from
   chat-service where the typed `FileDeliveryEntry` already lives.

## Consequences

### Positive

- Both dominant queries drop from sequential scans to index lookups.
  Local measurement on the soak install: "messages that received file
  X" goes from ~3.1 s to ~14 ms; "models that received file Y as
  NATIVE_IMAGE" goes from ~5.8 s to ~9 ms (partial index).
- Typed `deliveryMode` column instead of JSON string union — Prisma
  generates a Postgres enum and the FE consumer gets a discriminated
  union for free.
- Audit / GDPR / retention queries all simplify dramatically. The
  "blank-out every compare answer that quoted deleted file X" flow
  becomes a single `UPDATE ... WHERE fileId = X` instead of a
  full-table JSON walk.
- Foreign key `messageId → ChatMessage(id) ON DELETE CASCADE` means
  message deletion automatically cleans up the delivery records.
- Indexes are tunable independently of `ChatMessage` indexes, so the
  hot path for compare runs (insert assistant message) does not pay
  the cost of indexes that only the file-usage dashboard needs.

### Negative

- Dual-write window adds ~5-10 ms per assistant-message insert (one
  extra `INSERT` per `FileDeliveryEntry` written). Acceptable; the
  compare hot path is dominated by the LLM call.
- ~30 days of operational vigilance on the drift checker. The drift
  checker itself is a 50-line cron job; the cost is human attention,
  not compute.
- One more table to back up, monitor, and migrate. Mitigated by the
  existing per-service backup automation — file_delivery_records lives
  in `claw_chat`, which is already backed up.
- Schema change in `claw-chat-service` requires a Prisma migration
  step in the rollout. Handled by the existing entrypoint that runs
  `prisma migrate deploy` on container start.

### Mitigations

- **Drift checker**: hourly job compares `metadata.fileDelivery` JSON
  to the new table rows for messages created in the last hour. Any
  divergence pages the on-call channel.
- **Backfill idempotency**: `ON CONFLICT (messageId, fileId, modelKey)
DO NOTHING` means the backfill can re-run safely if interrupted.
- **Feature flag escape hatch**: `FILE_DELIVERY_RECORDS_DUAL_WRITE`
  defaults to `true`. Setting it to `false` disables the new table
  write (legacy JSON only) so a regression can be rolled back without
  a code revert. Removed after the 30-day window closes.

## Related ADRs

- ADR-050: Critic as sibling plan feature of Judge — the same compare
  pipeline this table indexes.
- ADR-053: File retention sweeper + ZIP archive guardrails — the
  retention sweeper is one of the dominant readers of
  `file_delivery_records`.
- ADR-029: Capability framework — the audit consumer that reads
  these records lives in the same audit pipeline.
