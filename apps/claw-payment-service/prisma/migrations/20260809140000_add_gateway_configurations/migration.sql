CREATE TABLE "gateway_configurations" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL,
    "encrypted_credentials" JSONB NOT NULL DEFAULT '{}',
    "options" JSONB NOT NULL DEFAULT '{}',
    "encryption_key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gateway_configurations_gateway_key"
ON "gateway_configurations"("gateway");

CREATE INDEX "gateway_configurations_is_enabled_idx"
ON "gateway_configurations"("is_enabled");
