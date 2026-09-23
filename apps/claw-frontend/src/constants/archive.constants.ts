import {
  CheckCircle2,
  Clock,
  FileQuestion,
  HardDrive,
  Layers,
  Lock,
  Scissors,
  ShieldAlert,
} from 'lucide-react';

import { ArchiveEntryDisplayStatus } from '@/enums/archive-entry-display-status.enum';
import { ArchiveEntryStatus } from '@/enums/archive-entry-status.enum';
import { ArchiveRejectionReason } from '@/enums/archive-rejection-reason.enum';
import type { ArchiveStatusPresentation } from '@/types/archive.types';

/** Entry paths inside an archive always use forward slashes (file-service normalises them). */
export const ARCHIVE_PATH_SEPARATOR = '/';

/**
 * Eleven backend statuses → the eight a person needs. A status missing here is
 * shown as Unsupported rather than as a raw string.
 */
export const ARCHIVE_DISPLAY_STATUS_BY_ENTRY_STATUS: ReadonlyMap<
  string,
  ArchiveEntryDisplayStatus
> = new Map<string, ArchiveEntryDisplayStatus>([
  [ArchiveEntryStatus.Included, ArchiveEntryDisplayStatus.Extracted],
  [ArchiveEntryStatus.IncludedTruncated, ArchiveEntryDisplayStatus.Partial],
  [ArchiveEntryStatus.OmittedForBudget, ArchiveEntryDisplayStatus.Partial],
  [ArchiveEntryStatus.NotText, ArchiveEntryDisplayStatus.Unsupported],
  [ArchiveEntryStatus.Unreadable, ArchiveEntryDisplayStatus.Unsupported],
  [ArchiveEntryStatus.SkippedUnsafe, ArchiveEntryDisplayStatus.Blocked],
  [ArchiveEntryStatus.SkippedLink, ArchiveEntryDisplayStatus.Blocked],
  [ArchiveEntryStatus.SkippedSpecialFile, ArchiveEntryDisplayStatus.Blocked],
  [ArchiveEntryStatus.SkippedTooLarge, ArchiveEntryDisplayStatus.TooLarge],
  [ArchiveEntryStatus.SkippedEncrypted, ArchiveEntryDisplayStatus.Encrypted],
  [ArchiveEntryStatus.SkippedNestingDepth, ArchiveEntryDisplayStatus.TooDeep],
  [ArchiveEntryStatus.Pending, ArchiveEntryDisplayStatus.Pending],
]);

/** Icon + label for every display status. The icon carries the tone; the text stays foreground. */
export const ARCHIVE_STATUS_PRESENTATION: Readonly<
  Record<ArchiveEntryDisplayStatus, ArchiveStatusPresentation>
> = {
  [ArchiveEntryDisplayStatus.Extracted]: {
    labelKey: 'files.archive.status.extracted',
    icon: CheckCircle2,
    iconClass: 'text-success',
  },
  [ArchiveEntryDisplayStatus.Partial]: {
    labelKey: 'files.archive.status.partial',
    icon: Scissors,
    iconClass: 'text-warning',
  },
  [ArchiveEntryDisplayStatus.Pending]: {
    labelKey: 'files.archive.status.pending',
    icon: Clock,
    iconClass: 'text-muted-foreground',
  },
  [ArchiveEntryDisplayStatus.Encrypted]: {
    labelKey: 'files.archive.status.encrypted',
    icon: Lock,
    iconClass: 'text-warning',
  },
  [ArchiveEntryDisplayStatus.TooLarge]: {
    labelKey: 'files.archive.status.tooLarge',
    icon: HardDrive,
    iconClass: 'text-warning',
  },
  [ArchiveEntryDisplayStatus.Unsupported]: {
    labelKey: 'files.archive.status.unsupported',
    icon: FileQuestion,
    iconClass: 'text-muted-foreground',
  },
  [ArchiveEntryDisplayStatus.Blocked]: {
    labelKey: 'files.archive.status.blocked',
    icon: ShieldAlert,
    iconClass: 'text-destructive',
  },
  [ArchiveEntryDisplayStatus.TooDeep]: {
    labelKey: 'files.archive.status.tooDeep',
    icon: Layers,
    iconClass: 'text-warning',
  },
};

/**
 * The `CODE` of an archive extractionError (`ZIP_PATH_TRAVERSAL: ...`). Prefix-
 * based, the same rule file-service uses to call a row an archive.
 */
export const ARCHIVE_ERROR_CODE_PATTERN = /^((?:ZIP|ARCHIVE)_[A-Z_]+):/u;

/** Codes file-service writes today (zip-expansion.constants.ts, archive formats). */
export const ARCHIVE_REJECTION_BY_CODE: ReadonlyMap<string, ArchiveRejectionReason> = new Map([
  ['ZIP_BOMB_RATIO', ArchiveRejectionReason.Bomb],
  ['ZIP_CUMULATIVE_SIZE_EXCEEDED', ArchiveRejectionReason.TooLarge],
  ['ZIP_TOO_MANY_ENTRIES', ArchiveRejectionReason.TooManyEntries],
  ['ZIP_PATH_TRAVERSAL', ArchiveRejectionReason.Traversal],
  ['ARCHIVE_ENCRYPTED', ArchiveRejectionReason.Encrypted],
  ['ARCHIVE_UNSUPPORTED_FORMAT', ArchiveRejectionReason.Unsupported],
  ['ARCHIVE_LISTING_INVALID', ArchiveRejectionReason.Generic],
  ['ZIP_EXPANSION_FAILED', ArchiveRejectionReason.Generic],
]);

/**
 * A code not in the table above is read by keyword, in this order, so a new
 * backend code still gets a specific message. First match wins.
 */
export const ARCHIVE_REJECTION_KEYWORDS: ReadonlyArray<readonly [string, ArchiveRejectionReason]> =
  [
    ['TRAVERSAL', ArchiveRejectionReason.Traversal],
    ['BOMB', ArchiveRejectionReason.Bomb],
    ['RATIO', ArchiveRejectionReason.Bomb],
    ['TOO_MANY', ArchiveRejectionReason.TooManyEntries],
    ['DEPTH', ArchiveRejectionReason.TooDeep],
    ['NESTING', ArchiveRejectionReason.TooDeep],
    ['ENCRYPT', ArchiveRejectionReason.Encrypted],
    ['PASSWORD', ArchiveRejectionReason.Encrypted],
    ['SIZE', ArchiveRejectionReason.TooLarge],
    ['UNSUPPORTED', ArchiveRejectionReason.Unsupported],
  ];

export const ARCHIVE_REJECTION_MESSAGE_KEYS: Readonly<Record<ArchiveRejectionReason, string>> = {
  [ArchiveRejectionReason.Bomb]: 'files.archive.rejected.bomb',
  [ArchiveRejectionReason.TooLarge]: 'files.archive.rejected.tooLarge',
  [ArchiveRejectionReason.TooManyEntries]: 'files.archive.rejected.tooManyEntries',
  [ArchiveRejectionReason.Traversal]: 'files.archive.rejected.traversal',
  [ArchiveRejectionReason.TooDeep]: 'files.archive.rejected.tooDeep',
  [ArchiveRejectionReason.Encrypted]: 'files.archive.rejected.encrypted',
  [ArchiveRejectionReason.PartlyEncrypted]: 'files.archive.rejected.partlyEncrypted',
  [ArchiveRejectionReason.Unsupported]: 'files.archive.rejected.unsupported',
  [ArchiveRejectionReason.Generic]: 'files.archive.rejected.generic',
};

/** An archive this small opens with every folder expanded; a bigger one starts collapsed. */
export const ARCHIVE_TREE_AUTO_EXPAND_MAX_ENTRIES = 25;

/** Indent per tree level, in rem. Applied as `padding-inline-start`, so RTL mirrors it. */
export const ARCHIVE_TREE_INDENT_REM = 1;
export const ARCHIVE_TREE_BASE_INDENT_REM = 0.25;

/** A finished archive's contents do not change; re-asking is wasted work. */
export const ARCHIVE_ENTRIES_STALE_MS = 5 * 60 * 1000;
