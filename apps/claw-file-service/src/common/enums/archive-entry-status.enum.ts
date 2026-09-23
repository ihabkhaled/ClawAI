/**
 * What happened to one entry of an expanded archive, as the archive manifest
 * reports it to the model and the user.
 *
 * The values are the literal labels written into the manifest's file tree, so
 * they are kebab-case words a reader understands without a legend.
 */
export enum ArchiveEntryStatus {
  /** Extracted, readable, and its whole text is in the manifest. */
  INCLUDED = 'included',
  /** Extracted and readable, but only the head of its text fitted the budget. */
  INCLUDED_TRUNCATED = 'included-truncated',
  /** Extracted and readable, but left out entirely to fit the budget. */
  OMITTED_FOR_BUDGET = 'omitted-for-budget',
  /** Extracted, but has no text a model can use (binary, image without OCR, audio, video). */
  NOT_TEXT = 'not-text',
  /**
   * Text extraction failed for this entry, or the engine listed it but did not
   * produce it (a corrupt member, or a name the listing could not print verbatim).
   */
  UNREADABLE = 'unreadable',
  /** Failed the upload security checks (ClamAV, magic bytes, extension blocklist). */
  SKIPPED_UNSAFE = 'skipped-unsafe',
  /** Larger than a single upload may be, so it was never extracted. */
  SKIPPED_TOO_LARGE = 'skipped-too-large',
  /** Password-protected. Password support is a later batch. */
  SKIPPED_ENCRYPTED = 'skipped-encrypted',
  /** A nested archive at the ZIP_MAX_NESTING_DEPTH limit, so it was not opened. */
  SKIPPED_NESTING_DEPTH = 'skipped-nesting-depth',
  /**
   * A symbolic or hard link. Never extracted: a link is how an archive aims a
   * later write, or a later read, outside the extraction directory.
   */
  SKIPPED_LINK = 'skipped-link',
  /** A device node, FIFO or socket. Not a file anyone uploads to be read. */
  SKIPPED_SPECIAL_FILE = 'skipped-special-file',
}
