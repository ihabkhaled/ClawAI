-- Extraction output, stored separately from `content`.
--
-- `content` holds the base64 of the ORIGINAL bytes; `extracted_text` holds the
-- readable text a language model is given. They are not interchangeable: a PDF's
-- `content` is a base64 blob, and feeding that to a model is what produced the
-- "I can't read the attached file" replies this migration exists to fix.
--
-- The text is not reassembled from `file_chunks` on read, for two reasons.
-- Chunking is lossy for that purpose: it trims, drops empty chunks, and repeats
-- the header row on every CSV chunk. And the chunks endpoint performs no
-- ownership check, so routing attachment content through it would put user
-- documents on an IDOR-shaped route.
ALTER TABLE "files" ADD COLUMN "extracted_text" TEXT;
ALTER TABLE "files" ADD COLUMN "extraction_error" TEXT;

-- The old default asserted every upload was already processed. Nothing ever
-- processed them, so the column reported COMPLETED for work that never ran and
-- the frontend's PENDING/PROCESSING poller could never fire.
ALTER TABLE "files" ALTER COLUMN "ingestion_status" SET DEFAULT 'PENDING';

-- Deliberately NO backfill of historical rows.
--
-- Flipping every pre-existing COMPLETED row to PENDING was the obvious move and
-- it is a trap: nothing reprocesses history, so those rows would sit at PENDING
-- forever, and useFiles() polls a 4.2 MB endpoint on an uncapped interval for as
-- long as ANY row is PENDING or PROCESSING. A data migration would have created
-- a permanent poll loop for every existing user.
--
-- History is instead healed lazily and per-file: when a legacy row is actually
-- attached to a message, FilesService re-runs extraction for that one file. A
-- file nobody opens again costs nothing. See
-- docs/13-adr/adr-093-attachment-text-extraction-pipeline.md.
