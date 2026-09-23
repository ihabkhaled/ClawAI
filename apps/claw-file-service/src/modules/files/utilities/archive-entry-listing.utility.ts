import { FileIngestionStatus } from '../../../generated/prisma';
import { ArchiveEntryStatus } from '../../../common/enums/archive-entry-status.enum';
import {
  ARCHIVE_BYTE_UNIT_MULTIPLIERS,
  ARCHIVE_ENTRY_PENDING_STATUS,
  ARCHIVE_ERROR_CODE_PATTERN,
  ARCHIVE_TREE_HEADER_PREFIX,
  ARCHIVE_TREE_LINE_SIZE_PATTERN,
  ARCHIVE_TREE_LINE_STATUS_PATTERN,
  ARCHIVE_TREE_UNLISTED_PATTERN,
} from '../constants/archive-entries.constants';
import type {
  ArchiveChildRow,
  ArchiveEntryView,
  MergeArchiveEntriesInput,
  MergedArchiveEntries,
  ParsedManifestLine,
  ParsedManifestTree,
} from '../types/archive-entries.types';
import { sanitizeManifestLabel } from './archive-manifest.utility';

// The per-entry status of an archive (extracted, encrypted, too large, unsafe…)
// is decided once, during expansion, and written only into the manifest's file
// tree. Skipped entries never become rows at all. So the UI's tree is the
// manifest's tree read back, joined to the child rows by path for their ids.
// Pure response mapping: nothing here decides a status, it only reports one.

/** Reads the file tree out of an archive manifest. Empty for any other text. */
export function parseManifestTree(text: string | null): ParsedManifestTree {
  const tree: ParsedManifestTree = { lines: [], unlistedCount: 0 };
  if (text === null) {
    return tree;
  }
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.startsWith(ARCHIVE_TREE_HEADER_PREFIX));
  if (start < 0) {
    return tree;
  }
  for (const line of lines.slice(start + 1)) {
    if (line.length === 0) {
      break;
    }
    const unlisted = ARCHIVE_TREE_UNLISTED_PATTERN.exec(line);
    if (unlisted !== null) {
      tree.unlistedCount += Number(unlisted[1]);
      continue;
    }
    const parsed = parseTreeLine(line);
    if (parsed !== null) {
      tree.lines.push(parsed);
    }
  }
  return tree;
}

/** Whether the manifest opened a file tree at all — the mark of an expanded archive. */
export function hasManifestTree(text: string | null): boolean {
  return text?.split('\n').some((line) => line.startsWith(ARCHIVE_TREE_HEADER_PREFIX)) === true;
}

/** An error the archive pipeline wrote, e.g. `ZIP_PATH_TRAVERSAL: ...`. */
export function isArchiveErrorMessage(message: string | null): boolean {
  return message !== null && ARCHIVE_ERROR_CODE_PATTERN.test(message);
}

/**
 * Joins the manifest's tree to the child rows. A tree line with a matching
 * child gets its id and exact size; a child the tree does not list (the tree
 * hit its limit, or the manifest is not written yet) gets a status from its
 * own ingestion state.
 */
export function mergeArchiveEntries(input: MergeArchiveEntriesInput): MergedArchiveEntries {
  const childrenByPath = groupChildrenByLabel(input.children);
  const entries: ArchiveEntryView[] = input.tree.lines.map((line) => {
    const child = childrenByPath.get(line.archivePath)?.shift();
    return child === undefined
      ? toSkippedView(line)
      : toChildView(child, line.status, line.detail, input.grandchildCounts);
  });
  for (const remaining of childrenByPath.values()) {
    for (const child of remaining) {
      entries.push(
        toChildView(
          child,
          statusFromIngestion(child.ingestionStatus),
          null,
          input.grandchildCounts,
        ),
      );
    }
  }
  entries.sort((a, b) => a.archivePath.localeCompare(b.archivePath));

  const listed = entries.slice(0, input.maxEntries);
  const treeTotal = input.tree.lines.length + input.tree.unlistedCount;
  const total = Math.max(treeTotal, input.totalChildCount, entries.length);
  return { entries: listed, unlistedEntryCount: Math.max(0, total - listed.length) };
}

// Parsed with plain string search rather than one composite regex — see
// ARCHIVE_TREE_LINE_SIZE_PATTERN's comment. Read from both ends inward: the
// " — " before status is searched from the right (a path may itself contain
// " — "... though sanitizeManifestLabel never puts one there, this stays
// correct either way since size/status are the two fixed, recognisable
// anchors), and the last " (" gives the size segment even when the path itself
// contains parentheses (e.g. "notes (v2)").
function parseTreeLine(line: string): ParsedManifestLine | null {
  if (!line.startsWith('- ')) {
    return null;
  }
  const dashIndex = line.lastIndexOf(' — ');
  if (dashIndex < 0) {
    return null;
  }
  const left = line.slice(2, dashIndex);
  const right = line.slice(dashIndex + 3);

  const openParen = left.lastIndexOf(' (');
  if (openParen < 0 || !left.endsWith(')')) {
    return null;
  }
  const archivePath = left.slice(0, openParen);
  const sizeMatch = ARCHIVE_TREE_LINE_SIZE_PATTERN.exec(left.slice(openParen + 2, -1));
  if (archivePath.length === 0 || sizeMatch === null) {
    return null;
  }

  const colonIndex = right.indexOf(': ');
  const status = colonIndex < 0 ? right : right.slice(0, colonIndex);
  if (!ARCHIVE_TREE_LINE_STATUS_PATTERN.test(status)) {
    return null;
  }

  const [, amount = '0', unit = 'B'] = sizeMatch;
  return {
    archivePath,
    sizeBytes: Math.round(Number(amount) * (ARCHIVE_BYTE_UNIT_MULTIPLIERS.get(unit) ?? 1)),
    status,
    detail: colonIndex < 0 ? null : right.slice(colonIndex + 2),
  };
}

// Keyed by the SANITISED path, because that is what the manifest wrote. A queue
// per key, so two entries that sanitise to the same label still both appear.
function groupChildrenByLabel(
  children: ReadonlyArray<ArchiveChildRow>,
): Map<string, ArchiveChildRow[]> {
  const byLabel = new Map<string, ArchiveChildRow[]>();
  for (const child of children) {
    const label = sanitizeManifestLabel(child.archivePath ?? child.filename);
    const queue = byLabel.get(label) ?? [];
    queue.push(child);
    byLabel.set(label, queue);
  }
  return byLabel;
}

function toSkippedView(line: ParsedManifestLine): ArchiveEntryView {
  return {
    archivePath: line.archivePath,
    sizeBytes: line.sizeBytes,
    status: line.status,
    detail: line.detail,
    childFileId: null,
    mimeType: null,
    childCount: 0,
  };
}

function toChildView(
  child: ArchiveChildRow,
  status: string,
  detail: string | null,
  grandchildCounts: ReadonlyMap<string, number>,
): ArchiveEntryView {
  return {
    archivePath: child.archivePath ?? child.filename,
    sizeBytes: child.sizeBytes,
    status,
    detail,
    childFileId: child.id,
    mimeType: child.mimeType,
    childCount: grandchildCounts.get(child.id) ?? 0,
  };
}

function statusFromIngestion(status: FileIngestionStatus): string {
  if (status === FileIngestionStatus.COMPLETED) {
    return ArchiveEntryStatus.INCLUDED;
  }
  return status === FileIngestionStatus.FAILED
    ? ArchiveEntryStatus.UNREADABLE
    : ARCHIVE_ENTRY_PENDING_STATUS;
}
