-- V2 Stream 01e — add dryRun mode to RecipeRun.
--
-- dryRun runs propose-and-skip every step instead of actually invoking
-- the capability framework. Step rows are still created so the visual
-- builder's preview UI can show the resolved target/payload for each
-- step. metadata.dryRun=true is also set on each step row to keep the
-- output consistent for downstream consumers.
--
-- Default is false so every existing row remains a real run.

ALTER TABLE "recipe_runs" ADD COLUMN "dryRun" BOOLEAN NOT NULL DEFAULT false;
