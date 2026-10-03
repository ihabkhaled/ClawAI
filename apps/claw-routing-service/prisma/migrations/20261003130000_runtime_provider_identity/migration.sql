ALTER TYPE "RouterProvider" ADD VALUE 'CUSTOM_OPENAI_COMPATIBLE';
ALTER TABLE "model_deployments" ADD COLUMN "runtime_provider_key" TEXT;
