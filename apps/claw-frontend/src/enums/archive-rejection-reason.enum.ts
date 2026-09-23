// Why file-service refused to open an archive, read from the `CODE:` prefix of
// its extractionError. Unknown codes map by keyword, then to Generic.
export enum ArchiveRejectionReason {
  /** Expands to far more than it holds: a likely zip bomb. */
  Bomb = 'bomb',
  /** Its contents exceed the total size allowed for one upload. */
  TooLarge = 'tooLarge',
  TooManyEntries = 'tooManyEntries',
  /** An entry's path points outside the archive (or through a link). */
  Traversal = 'traversal',
  TooDeep = 'tooDeep',
  /** Every file (or the file list itself) is password-protected. */
  Encrypted = 'encrypted',
  /** Some files are password-protected; the rest were delivered. Not fatal. */
  PartlyEncrypted = 'partlyEncrypted',
  /** The bytes are not an archive format we can open. */
  Unsupported = 'unsupported',
  Generic = 'generic',
}
