// What happened to one entry of an uploaded archive, exactly as file-service
// reports it (`GET /files/:id/archive-entries`). The values mirror
// ArchiveEntryStatus in claw-file-service plus PENDING, which the listing
// reports while the archive is still being expanded. A value this list does
// not know is shown as "unsupported" (see ARCHIVE_DISPLAY_STATUS_BY_ENTRY_STATUS),
// so a new backend status degrades to a sane label instead of a raw string.
export enum ArchiveEntryStatus {
  Included = 'included',
  IncludedTruncated = 'included-truncated',
  OmittedForBudget = 'omitted-for-budget',
  NotText = 'not-text',
  Unreadable = 'unreadable',
  SkippedUnsafe = 'skipped-unsafe',
  SkippedTooLarge = 'skipped-too-large',
  SkippedEncrypted = 'skipped-encrypted',
  SkippedNestingDepth = 'skipped-nesting-depth',
  SkippedLink = 'skipped-link',
  SkippedSpecialFile = 'skipped-special-file',
  Pending = 'pending',
}
