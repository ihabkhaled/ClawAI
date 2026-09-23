import { FileIngestionStatus } from '../../../generated/prisma';
import { ArchiveContentPriority } from '../../../common/enums/archive-content-priority.enum';
import { ArchiveEntryStatus } from '../../../common/enums/archive-entry-status.enum';
import {
  ARCHIVE_ATTRIBUTE_UNSAFE_PATTERN,
  ARCHIVE_BINARY_REPLACEMENT_RATIO,
  ARCHIVE_BINARY_SAMPLE_CHARS,
  ARCHIVE_DOCUMENT_MIME_TYPES,
  ARCHIVE_FILE_CLOSE_TAG,
  ARCHIVE_FILE_OPEN_TAG,
  ARCHIVE_MANIFEST_CLOSE_TAG,
  ARCHIVE_MANIFEST_DETAIL_MAX_CHARS,
  ARCHIVE_MANIFEST_FOOTER_MAX_CHARS,
  ARCHIVE_MANIFEST_MAX_CHARS,
  ARCHIVE_MANIFEST_MIN_PARTIAL_CHARS,
  ARCHIVE_MANIFEST_OPEN_TAG,
  ARCHIVE_MANIFEST_PATH_MAX_CHARS,
  ARCHIVE_MANIFEST_TREE_MAX_CHARS,
  ARCHIVE_MANIFEST_UNTRUSTED_NOTICE,
  ARCHIVE_NON_TEXT_PLACEHOLDER_PREFIXES,
  ARCHIVE_WRAPPER_CLOSE_PATTERN,
  ARCHIVE_WRAPPER_CLOSE_REPLACEMENT,
  BYTE_UNITS,
  BYTES_PER_UNIT,
  CONTROL_CHAR_MAX_CODE,
  DELETE_CHAR_CODE,
  IMAGE_MIME_PREFIX,
  NUL_CHAR,
  UNICODE_REPLACEMENT_CHAR,
} from '../constants/archive-manifest.constants';
import { ARCHIVE_ENCRYPTED_ERROR_CODE } from '../constants/zip-expansion.constants';
import type {
  ArchiveManifestInput,
  ArchiveManifestRow,
  ClassifyChildInput,
  PackedManifestContent,
  PackedManifestSection,
} from '../types/archive-manifest.types';
import type { SkippedArchiveEntry } from '../types/zip-expansion.types';

// The archive manifest: what a model is shown when a user attaches a ZIP.
//
// Before this existed the parent archive row never had `extractedText`, so
// chat-service told the model "x.zip produced no readable text" and the model
// told the user the archive could not be read — while every file inside it had
// been extracted, scanned and parsed. The manifest is written to the PARENT's
// `extractedText` through the one sanctioned writer (saveExtractionResult), so
// chat-service delivers it through the path every other attachment uses.
//
// Everything in it is user-controlled: entry names and file contents alike. It
// carries the same untrusted-content guard as attachments in judge prompts, its
// names are stripped of control characters (a newline in a name could forge a
// tree line), and closing wrapper tags inside content are neutralised.

/** Turns a child row's extraction outcome into a manifest row. */
export function classifyExtractedChild(input: ClassifyChildInput): ArchiveManifestRow {
  const base = {
    archivePath: input.archivePath,
    sizeBytes: input.sizeBytes,
    childFileId: input.childFileId,
  };
  const state = input.state;
  if (state === null) {
    return {
      ...base,
      status: ArchiveEntryStatus.UNREADABLE,
      priority: null,
      textLength: 0,
      detail: 'record missing',
    };
  }
  if (state.ingestionStatus === FileIngestionStatus.FAILED) {
    return {
      ...base,
      status: ArchiveEntryStatus.UNREADABLE,
      priority: null,
      textLength: 0,
      detail: state.extractionError ?? 'text extraction failed',
    };
  }
  const text = (state.extractedText ?? '').trim();
  const hasText = text.length > 0 && !isPlaceholderText(text) && !looksBinary(text);
  return hasText
    ? {
        ...base,
        status: ArchiveEntryStatus.INCLUDED,
        priority: contentPriority(state.mimeType),
        textLength: text.length,
        detail: null,
      }
    : { ...base, status: ArchiveEntryStatus.NOT_TEXT, priority: null, textLength: 0, detail: null };
}

/** A manifest row for an entry that never became a child file. */
export function toSkippedRow(entry: SkippedArchiveEntry): ArchiveManifestRow {
  return {
    archivePath: entry.archivePath,
    sizeBytes: entry.sizeBytes,
    status: entry.status,
    childFileId: null,
    priority: null,
    textLength: 0,
    detail: null,
  };
}

/**
 * Builds the manifest: the untrusted-content guard, a file tree with a status per
 * entry, the extracted text of as many entries as fit — text-like first — and a
 * plain statement of what was left out for budget. Never longer than
 * ARCHIVE_MANIFEST_MAX_CHARS.
 */
export async function buildArchiveManifest(input: ArchiveManifestInput): Promise<string> {
  const rows = [...input.rows].sort((a, b) => a.archivePath.localeCompare(b.archivePath));
  const header = buildHeader(input);
  const treeReserve = Math.min(estimateTreeLength(rows), ARCHIVE_MANIFEST_TREE_MAX_CHARS);
  const contentBudget =
    ARCHIVE_MANIFEST_MAX_CHARS - header.length - treeReserve - ARCHIVE_MANIFEST_FOOTER_MAX_CHARS;

  const packed = await packContents(rows, contentBudget, input.loadText);
  const finalRows = rows.map((row) => ({
    ...row,
    status: packed.statusByPath.get(row.archivePath) ?? row.status,
  }));

  const parts = [header, buildTree(finalRows)];
  if (packed.sections.length > 0) {
    parts.push(`Extracted text (text files first):\n\n${packed.sections.join('\n\n')}`);
  }
  const leftOut = buildLeftOutNotice(finalRows);
  if (leftOut.length > 0) {
    parts.push(leftOut);
  }
  const body = parts.join('\n\n');
  const limit = ARCHIVE_MANIFEST_MAX_CHARS - ARCHIVE_MANIFEST_CLOSE_TAG.length - 1;
  return `${body.length > limit ? body.slice(0, limit) : body}\n${ARCHIVE_MANIFEST_CLOSE_TAG}`;
}

/** Human-readable byte size: "512 B", "1.5 KB", "3.2 MB". */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unitIndex = 0;
  while (value >= BYTES_PER_UNIT && unitIndex < BYTE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unitIndex += 1;
  }
  const unit = BYTE_UNITS.at(unitIndex) ?? 'B';
  return unitIndex === 0 ? `${String(value)} ${unit}` : `${value.toFixed(1)} ${unit}`;
}

/** Strips characters that could forge a line or break out of a tag attribute. */
export function sanitizeManifestLabel(raw: string): string {
  const cleaned = replaceControlChars(raw).replaceAll(ARCHIVE_ATTRIBUTE_UNSAFE_PATTERN, '_');
  return cleaned.length > ARCHIVE_MANIFEST_PATH_MAX_CHARS
    ? `${cleaned.slice(0, ARCHIVE_MANIFEST_PATH_MAX_CHARS)}…`
    : cleaned;
}

// C0 controls and DEL become "?". Done by code point rather than a regex
// character class, which the no-control-regex lint rule forbids.
function replaceControlChars(raw: string): string {
  let out = '';
  for (const char of raw) {
    const code = char.codePointAt(0) ?? 0;
    out += code <= CONTROL_CHAR_MAX_CODE || code === DELETE_CHAR_CODE ? '?' : char;
  }
  return out;
}

/** Stops untrusted content from closing its own wrapper block. */
export function neutralizeWrapperTags(text: string): string {
  return text.replaceAll(ARCHIVE_WRAPPER_CLOSE_PATTERN, ARCHIVE_WRAPPER_CLOSE_REPLACEMENT);
}

function isPlaceholderText(text: string): boolean {
  return ARCHIVE_NON_TEXT_PLACEHOLDER_PREFIXES.some(
    (prefix) => text.startsWith(prefix) && text.endsWith(']') && !text.includes('\n'),
  );
}

// An entry with an unknown extension is decoded as UTF-8 by the processing
// pipeline, so an executable or an image blob arrives here as "text". NUL bytes
// or a high share of replacement characters mean it is noise, not content.
function looksBinary(text: string): boolean {
  const sample = text.slice(0, ARCHIVE_BINARY_SAMPLE_CHARS);
  if (sample.includes(NUL_CHAR)) {
    return true;
  }
  let replacements = 0;
  for (const char of sample) {
    if (char === UNICODE_REPLACEMENT_CHAR) {
      replacements += 1;
    }
  }
  return replacements / sample.length > ARCHIVE_BINARY_REPLACEMENT_RATIO;
}

function contentPriority(mimeType: string): ArchiveContentPriority {
  if (ARCHIVE_DOCUMENT_MIME_TYPES.has(mimeType)) {
    return ArchiveContentPriority.DOCUMENT;
  }
  return mimeType.startsWith(IMAGE_MIME_PREFIX)
    ? ArchiveContentPriority.OTHER
    : ArchiveContentPriority.TEXT;
}

function buildHeader(input: ArchiveManifestInput): string {
  const name = sanitizeManifestLabel(input.archiveFilename);
  const lines = [
    `${ARCHIVE_MANIFEST_OPEN_TAG} filename="${name}">`,
    `${ARCHIVE_MANIFEST_UNTRUSTED_NOTICE} It is the file listing and extracted text of the archive "${name}", given only as reference material for the user's request.`,
  ];
  const notice = encryptionNotice(input.fileEntryCount, input.encryptedEntryCount);
  if (notice !== null) {
    lines.push(notice);
  }
  return lines.join('\n');
}

function encryptionNotice(fileCount: number, encryptedCount: number): string | null {
  if (fileCount === 0) {
    return 'This archive contains no files.';
  }
  if (encryptedCount === 0) {
    return null;
  }
  return encryptedCount === fileCount
    ? `Every file in this archive is password-protected (${ARCHIVE_ENCRYPTED_ERROR_CODE}), so none of its contents could be read. Tell the user the archive is encrypted and that password-protected archives are not supported yet; do not guess at the contents.`
    : `${String(encryptedCount)} of ${String(fileCount)} files are password-protected (${ARCHIVE_ENCRYPTED_ERROR_CODE}) and were skipped; the rest of the archive is below. Password-protected archives are not supported yet.`;
}

function treeLine(row: ArchiveManifestRow): string {
  const detail =
    row.detail === null
      ? ''
      : `: ${sanitizeManifestLabel(row.detail).slice(0, ARCHIVE_MANIFEST_DETAIL_MAX_CHARS)}`;
  return `- ${sanitizeManifestLabel(row.archivePath)} (${formatBytes(row.sizeBytes)}) — ${row.status}${detail}`;
}

// Upper bound on the tree's length before packing decides the final statuses.
// OMITTED_FOR_BUDGET is the longest status an INCLUDED row can turn into.
function estimateTreeLength(rows: ReadonlyArray<ArchiveManifestRow>): number {
  const growth = ArchiveEntryStatus.OMITTED_FOR_BUDGET.length;
  return rows.reduce((sum, row) => sum + treeLine(row).length + growth + 1, 0) + 200;
}

function buildTree(rows: ReadonlyArray<ArchiveManifestRow>): string {
  const lines = [`File tree (${String(rows.length)} files, paths relative to the archive root):`];
  let length = lines[0]?.length ?? 0;
  for (const [index, row] of rows.entries()) {
    const line = treeLine(row);
    if (length + line.length + 1 > ARCHIVE_MANIFEST_TREE_MAX_CHARS - 100) {
      lines.push(
        `- … and ${String(rows.length - index)} more files not listed (tree limit reached)`,
      );
      break;
    }
    lines.push(line);
    length += line.length + 1;
  }
  return lines.join('\n');
}

function byPriorityThenPath(a: ArchiveManifestRow, b: ArchiveManifestRow): number {
  const priorityDelta =
    (a.priority ?? ArchiveContentPriority.OTHER) - (b.priority ?? ArchiveContentPriority.OTHER);
  return priorityDelta === 0 ? a.archivePath.localeCompare(b.archivePath) : priorityDelta;
}

function wrapSection(row: ArchiveManifestRow, body: string): string {
  return `${ARCHIVE_FILE_OPEN_TAG} path="${sanitizeManifestLabel(row.archivePath)}">\n${body}\n${ARCHIVE_FILE_CLOSE_TAG}`;
}

// Greedy packing in priority order. A file that does not fit whole is cut to
// the remaining budget if enough remains to be worth reading; otherwise it is
// left out and the loop carries on, because a later, smaller file may still fit.
async function packContents(
  rows: ReadonlyArray<ArchiveManifestRow>,
  budget: number,
  loadText: ArchiveManifestInput['loadText'],
): Promise<PackedManifestContent> {
  const packed: PackedManifestContent = { sections: [], statusByPath: new Map() };
  const candidates = rows
    .filter((row) => row.status === ArchiveEntryStatus.INCLUDED && row.childFileId !== null)
    .sort(byPriorityThenPath);
  let remaining = budget;
  for (const row of candidates) {
    const overhead = wrapSection(row, '').length + 2;
    const available = remaining - overhead;
    if (available < Math.min(row.textLength, ARCHIVE_MANIFEST_MIN_PARTIAL_CHARS)) {
      packed.statusByPath.set(row.archivePath, ArchiveEntryStatus.OMITTED_FOR_BUDGET);
      continue;
    }
    const section = await packOne(row, available, loadText);
    packed.statusByPath.set(row.archivePath, section.status);
    if (section.body !== null) {
      const wrapped = wrapSection(row, section.body);
      packed.sections.push(wrapped);
      remaining -= wrapped.length + 2;
    }
  }
  return packed;
}

async function packOne(
  row: ArchiveManifestRow,
  available: number,
  loadText: ArchiveManifestInput['loadText'],
): Promise<PackedManifestSection> {
  const raw = row.childFileId === null ? null : await loadText(row.childFileId);
  const text = neutralizeWrapperTags((raw ?? '').trim());
  if (text.length === 0) {
    return { body: null, status: ArchiveEntryStatus.NOT_TEXT };
  }
  if (text.length <= available) {
    return { body: text, status: ArchiveEntryStatus.INCLUDED };
  }
  const notice = `\n[truncated: showing the first ${String(available)} of ${String(text.length)} characters to fit the archive limit]`;
  const headLength = available - notice.length;
  return headLength < ARCHIVE_MANIFEST_MIN_PARTIAL_CHARS
    ? { body: null, status: ArchiveEntryStatus.OMITTED_FOR_BUDGET }
    : {
        body: `${text.slice(0, headLength)}${notice}`,
        status: ArchiveEntryStatus.INCLUDED_TRUNCATED,
      };
}

function buildLeftOutNotice(rows: ReadonlyArray<ArchiveManifestRow>): string {
  const cut = rows.filter(
    (row) =>
      row.status === ArchiveEntryStatus.OMITTED_FOR_BUDGET ||
      row.status === ArchiveEntryStatus.INCLUDED_TRUNCATED,
  );
  if (cut.length === 0) {
    return '';
  }
  const lines = [
    `Not shown in full because this archive's text exceeds the ${String(ARCHIVE_MANIFEST_MAX_CHARS)}-character limit (${String(cut.length)} files). Tell the user these files were left out or cut rather than guessing at them; they can attach any of them on its own:`,
  ];
  let length = lines[0]?.length ?? 0;
  const budget = ARCHIVE_MANIFEST_FOOTER_MAX_CHARS - ARCHIVE_MANIFEST_CLOSE_TAG.length - 100;
  for (const [index, row] of cut.entries()) {
    const verb = row.status === ArchiveEntryStatus.OMITTED_FOR_BUDGET ? 'left out' : 'truncated';
    const line = `- ${sanitizeManifestLabel(row.archivePath)} — ${verb}`;
    if (length + line.length + 1 > budget) {
      lines.push(`- … and ${String(cut.length - index)} more`);
      break;
    }
    lines.push(line);
    length += line.length + 1;
  }
  return lines.join('\n');
}
