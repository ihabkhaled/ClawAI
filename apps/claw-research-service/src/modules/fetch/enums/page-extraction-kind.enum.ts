/**
 * Which extractor produced a page's text (`extractPageContent`). Fixed values
 * only, so it can leave the service as provenance without leaking anything.
 */
export enum PageExtractionKind {
  /** Readability found an article in the visible markup. */
  READABLE = 'READABLE',
  /** The whole visible page text (no article found). */
  PAGE_TEXT = 'PAGE_TEXT',
  /**
   * Visible text was thin, so the text came from the data the page itself
   * ships for its scripts (JSON-LD, `__NEXT_DATA__`, a React Router stream, …).
   */
  EMBEDDED_STATE = 'EMBEDDED_STATE',
  /** A site adapter read the page's own structured data (e.g. a ChatGPT share). */
  SITE_ADAPTER = 'SITE_ADAPTER',
}
