// The handful of outcomes a person needs to tell apart in an archive's tree.
// Eleven backend statuses collapse into these; each one has an icon AND a text
// label, never colour alone.
export enum ArchiveEntryDisplayStatus {
  /** Extracted, and its text reaches the model. */
  Extracted = 'extracted',
  /** Extracted, but only part of it (or none) fitted the archive's text budget. */
  Partial = 'partial',
  /** Still being extracted. */
  Pending = 'pending',
  Encrypted = 'encrypted',
  TooLarge = 'tooLarge',
  /** Extracted, but it has no text a model can read (binary, failed parse). */
  Unsupported = 'unsupported',
  /** Refused by the security checks, or a link / device file. */
  Blocked = 'blocked',
  /** An archive nested deeper than the limit, left unopened. */
  TooDeep = 'tooDeep',
}
