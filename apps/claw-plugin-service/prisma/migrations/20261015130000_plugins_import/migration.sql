-- Additive: imported (third-party) plugins, their inert files, the review drafts and the import audit.

CREATE TABLE "plugin_import_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_kind" TEXT NOT NULL,
    "source_ref" TEXT NOT NULL,
    "commit_sha" TEXT,
    "checksum" TEXT NOT NULL,
    "preview" JSONB NOT NULL,
    "files" JSONB NOT NULL,
    "total_bytes" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_import_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "imported_plugins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source_kind" TEXT NOT NULL,
    "source_ref" TEXT NOT NULL,
    "commit_sha" TEXT,
    "checksum" TEXT NOT NULL,
    "preview" JSONB NOT NULL,
    "total_bytes" INTEGER NOT NULL,
    "file_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_plugins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "imported_plugin_files" (
    "id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,

    CONSTRAINT "imported_plugin_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plugin_import_audit" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "plugin_name" TEXT NOT NULL,
    "source_kind" TEXT NOT NULL,
    "source_ref" TEXT NOT NULL,
    "commit_sha" TEXT,
    "checksum" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_import_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "plugin_import_drafts_user_id_expires_at_idx" ON "plugin_import_drafts"("user_id", "expires_at");
CREATE INDEX "imported_plugins_user_id_created_at_idx" ON "imported_plugins"("user_id", "created_at");
CREATE UNIQUE INDEX "imported_plugins_user_id_name_key_key" ON "imported_plugins"("user_id", "name_key");
CREATE UNIQUE INDEX "imported_plugin_files_plugin_id_path_key" ON "imported_plugin_files"("plugin_id", "path");
CREATE INDEX "plugin_import_audit_user_id_created_at_idx" ON "plugin_import_audit"("user_id", "created_at");

ALTER TABLE "imported_plugin_files" ADD CONSTRAINT "imported_plugin_files_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "imported_plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
