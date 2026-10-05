# Threads account deletion is durable and anonymous

Auth must commit account deletion and a durable outbox event in one database transaction. Publish a typed `user.deleted` event with retries; never synchronously reach into another service database.

Threads and Thread Generation consumers must be idempotent. Store only a SHA-256 user tombstone for deduplication. A retained publication must already be published, owner-approved, safety-approved, and index-eligible. Clear ownership, generation linkage, and source snapshots; retain only approved public revisions. Delete private work and pending private requests, remove reactions, anonymize public comments, and clear reporter/moderator identity and report details.

Generation must reject future jobs for a tombstoned user. Do not log raw account identifiers or event payloads. Cover duplicate delivery, retry, data cleanup, anonymous public reads, and enqueue-after-deletion with focused specs. Update product and QA records in the same batch.
