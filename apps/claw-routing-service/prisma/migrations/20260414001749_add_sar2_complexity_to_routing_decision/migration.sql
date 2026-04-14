-- CreateEnum
CREATE TYPE "ComplexityClass" AS ENUM ('SIMPLE', 'MEDIUM', 'COMPLEX', 'EXPERT');

-- AlterTable
ALTER TABLE "routing_decisions" ADD COLUMN     "complexity_class" "ComplexityClass",
ADD COLUMN     "explanation" JSONB,
ADD COLUMN     "routing_duration_ms" INTEGER;
