ALTER TABLE "plans" ADD COLUMN "is_trial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "trial_duration_days" INTEGER;
ALTER TABLE "plans" ADD CONSTRAINT "plans_trial_duration_check" CHECK (("is_trial" AND "trial_duration_days" = 30) OR (NOT "is_trial" AND "trial_duration_days" IS NULL));
UPDATE "plans" SET "is_trial" = true, "trial_duration_days" = 30 WHERE "slug" = 'free';

CREATE TABLE "plan_trial_redemptions" (
  "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "plan_id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL, "started_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_trial_redemptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_trial_redemptions_duration_check"
    CHECK ("expires_at" = "started_at" + INTERVAL '30 days')
);
CREATE UNIQUE INDEX "plan_trial_redemptions_user_id_key" ON "plan_trial_redemptions"("user_id");
CREATE UNIQUE INDEX "plan_trial_redemptions_assignment_id_key" ON "plan_trial_redemptions"("assignment_id");
CREATE INDEX "plan_trial_redemptions_plan_id_idx" ON "plan_trial_redemptions"("plan_id");

INSERT INTO "plan_trial_redemptions" ("id", "user_id", "plan_id", "assignment_id", "started_at", "expires_at")
SELECT 'trial_' || md5(a."user_id"), a."user_id", a."plan_id", a."id", a."starts_at", a."starts_at" + INTERVAL '30 days'
FROM (SELECT DISTINCT ON (upa."user_id") upa.* FROM "user_plan_assignments" upa JOIN "plans" p ON p."id" = upa."plan_id" WHERE p."slug" = 'free' ORDER BY upa."user_id", upa."starts_at", upa."id") a;
UPDATE "user_plan_assignments" upa
SET "entitlement_valid_until" = r."expires_at"
FROM "plan_trial_redemptions" r, "plans" p
WHERE upa."user_id" = r."user_id"
  AND upa."plan_id" = p."id"
  AND p."slug" = 'free';

ALTER TABLE "plan_trial_redemptions" ADD CONSTRAINT "plan_trial_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_trial_redemptions" ADD CONSTRAINT "plan_trial_redemptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plan_trial_redemptions" ADD CONSTRAINT "plan_trial_redemptions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "user_plan_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
