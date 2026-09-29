/**
 * Bounds for stateless text extraction.
 *
 * Every number here caps work done on bytes that are never stored, so none of
 * it can be recovered by looking at a row afterwards — the request is the only
 * record, which is a reason to bound it rather than to trust it.
 */

/**
 * Longest base64 payload accepted, about 15MB of file.
 *
 * Smaller than the 50MB upload limit on purpose: an upload is a thing a person
 * chose to keep, while this runs whenever an agent reads a file, and the cost
 * is paid on every read.
 */
export const EXTRACT_TEXT_MAX_BASE64_LENGTH = 20_000_000;

/** Highest page number that may be named. */
export const EXTRACT_TEXT_MAX_PAGE = 10_000;

/**
 * Most pages one call may cover.
 *
 * A range is for reading part of a document. Asking for a thousand pages is
 * asking for the document, which is what omitting the range already does, at
 * a cost the caller can see.
 */
export const EXTRACT_TEXT_MAX_PAGE_SPAN = 100;

/**
 * Non-whitespace characters below which one page counts as having no text layer.
 *
 * Scanning is judged per page here, not on the document's total length. The
 * upload path's rule — whole text under `SCANNED_PDF_CHAR_THRESHOLD` — was
 * written for whole documents, and a page range is short by nature: measured
 * live, pages 2-3 of a real text PDF came back with their text AND
 * `isScanned: true`, because together they were under 100 characters. An agent
 * told that distrusts text it actually received.
 *
 * A page counts as scanned only if it carries almost nothing, and a range only
 * if every page in it does — so a title page reading "Chapter 1" does not make
 * a document look scanned.
 */
export const EXTRACT_TEXT_SCANNED_PAGE_MIN_CHARS = 20;
