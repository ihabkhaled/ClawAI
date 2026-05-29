-- Fix migration drift introduced by 20260524000000_memory_context_v2.
-- That migration renamed context_pack_items."type" → "legacy_type" but did
-- not drop the original NOT NULL constraint. The Prisma schema declares
-- legacyType as optional (String?), so creating a new item via the V2
-- item_type path (which never sets legacy_type) violated the stale NOT NULL
-- constraint with a PrismaClientKnownRequestError. Bring the column in line
-- with the schema: legacy_type is only populated for migrated v1 rows.

ALTER TABLE "context_pack_items" ALTER COLUMN "legacy_type" DROP NOT NULL;
