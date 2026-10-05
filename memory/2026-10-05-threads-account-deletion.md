# Threads account deletion decision

Approved public works remain public after account deletion with anonymous attribution. Auth emits a durable deletion event. Threads removes private snapshots and jobs, reactions, pending private requests, and personal links; it retains only owner-approved, safety-approved, index-eligible public revisions and anonymizes comments. Generation deletes private job artifacts and records a hashed tombstone that blocks new jobs. See `rules/61-threads-account-deletion.md` and the Threads product spec.
