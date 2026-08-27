-- Splits the single `is_default` flag into two independent decisions.
--
-- `is_default` keeps its meaning: the plan a new signup is granted. It is NOT
-- touched here. `POST /admin/plans/:id/set-default` is a live operator endpoint,
-- so an install may deliberately point signup at a paid plan; forcing a value
-- would silently change what every future signup receives on those installs.
-- Moving the signup plan is an operator action, not a migration.
--
-- `is_popular` is the new marketing decision: which plan the public pricing page
-- badges "Most popular". Backfilled to `pro` where that slug exists, so the
-- badge does not vanish from the pricing page the moment this lands. Installs
-- without a `pro` plan come up with no badge, which renders cleanly.
--
-- `popular_key` emulates a partial unique index, exactly as
-- `plan_price_versions.active_key` already does: it carries the literal
-- 'popular' while a plan holds the badge and NULL otherwise. Postgres treats
-- every NULL as distinct, so any number of plans can be un-badged while a second
-- popular plan is rejected by the database itself rather than by an
-- application-level "unset the others" that two admins can race.

ALTER TABLE "plans" ADD COLUMN "is_popular" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN "popular_key" TEXT;

UPDATE "plans"
SET "is_popular" = true, "popular_key" = 'popular'
WHERE "slug" = 'pro';

CREATE UNIQUE INDEX "plans_popular_key_key" ON "plans"("popular_key");
