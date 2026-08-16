-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "allow_consensus_mode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN     "allow_escalation_chain" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN     "allow_repair_lab" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN     "allow_task_decomposer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN     "allow_best_of_n" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN     "allow_verifier" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN     "allow_pipeline_lab" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN     "allow_cost_ensemble" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN     "allow_role_pack" BOOLEAN NOT NULL DEFAULT false;
