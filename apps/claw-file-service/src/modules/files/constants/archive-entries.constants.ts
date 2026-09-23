/**
 * Reading an archive manifest's file tree back into entries, for the UI.
 *
 * The line format is written by `treeLine` in archive-manifest.utility.ts:
 *   `- <path> (<size>) — <status>[: <detail>]`
 * The round-trip spec (archive-entry-listing.utility.spec.ts) builds a real
 * manifest and parses it, so a change to that format fails CI instead of
 * silently emptying the tree in the UI.
 */

/** The line that opens the tree: `File tree (N files, ...):`. */
export const ARCHIVE_TREE_HEADER_PREFIX = 'File tree (';

/**
 * `- <path> (<size unit>) — <status>[: <detail>]`, split by `parseTreeLine`
 * with plain string search (` — ` from the right, then ` (` from the right)
 * rather than one composite regex: the path is untrusted (an uploaded
 * archive's own entry names), and a single regex with an unbounded group on
 * each side of shared literals is exactly the shape
 * `security/detect-unsafe-regex` flags as a backtracking risk. These two are
 * each anchored, single-quantifier and safe on their own.
 */
export const ARCHIVE_TREE_LINE_SIZE_PATTERN = /^([\d.]+) (B|KB|MB|GB)$/u;
export const ARCHIVE_TREE_LINE_STATUS_PATTERN = /^[a-z][a-z-]*$/u;

/** The tail line written when the tree hit its size limit. */
export const ARCHIVE_TREE_UNLISTED_PATTERN = /^- … and (\d+) more files not listed/u;

export const ARCHIVE_BYTE_UNIT_MULTIPLIERS: ReadonlyMap<string, number> = new Map([
  ['B', 1],
  ['KB', 1024],
  ['MB', 1024 * 1024],
  ['GB', 1024 * 1024 * 1024],
]);

/**
 * Status of a child whose archive has not been written a manifest yet — the
 * expansion is still running. Not an ArchiveEntryStatus: the manifest never says it.
 */
export const ARCHIVE_ENTRY_PENDING_STATUS = 'pending';

/**
 * Most entries one listing returns. An archive may hold 10,000 files; the UI
 * tree shows what fits and states how many more exist.
 */
export const ARCHIVE_ENTRY_LISTING_MAX = 1_000;

/**
 * An extractionError written by the archive pipeline: `ZIP_PATH_TRAVERSAL: ...`,
 * `ARCHIVE_ENCRYPTED: ...`. Prefix-based so new archive codes are recognised
 * without a change here.
 */
export const ARCHIVE_ERROR_CODE_PATTERN = /^(?:ZIP|ARCHIVE)_[A-Z_]+:/u;
