-- F099: signed webhook trigger for prompt routines. Off by default (webhookEnabled false), so no
-- existing routine gains a public entry point. The secret is derived from the master key and
-- webhookSecretVersion, never stored; bumping the version retires the previous secret.
ALTER TABLE "scheduled_commands" ADD COLUMN "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "webhookSecretVersion" INTEGER NOT NULL DEFAULT 0;
