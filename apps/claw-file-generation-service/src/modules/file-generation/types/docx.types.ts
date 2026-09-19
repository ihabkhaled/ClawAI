/**
 * Where a block sits while it is rendered to Word (F3, ADR-107).
 *
 * docx 9.7 ships a single bundled declaration file, so the library's own types
 * are used directly. The hand-written API contract this file used to hold was
 * needed only while docx re-exported through extensionless paths.
 */
export type DocxBlockContext = {
  /** -1 outside a list; 0 for a top-level list item, 1 for nested, … */
  listLevel: number;
  ordered: boolean;
  /** Numbering instance, so every ordered list restarts at 1. */
  instance: number;
  quote: boolean;
};

/** Hands out numbering instances in document order. */
export type NumberingCounter = { next: number };
