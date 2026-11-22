import { stringify } from 'csv-stringify/sync';
import JSZip from 'jszip';

import {
  CODE_LANGUAGE_EXTENSIONS,
  ZIP_DIRECTORY_CHARACTER,
  ZIP_FILENAME_HINT,
  ZIP_MAX_FILES,
  ZIP_MAX_HINT_DIRECTORIES,
  ZIP_MAX_HINT_LENGTH,
} from '../constants/document-render.constants';
import { BlockKind } from '../enums/document-node.enum';
import type { DocumentBlock, TableBlock } from '../types/markdown-document.types';
import type { BundleFile } from '../types/office-document.types';
import { tableRows } from './document-table.utility';
import { blockText, flattenBlocks } from './markdown-document.utility';
import { csvSafeCell } from './spreadsheet-cell.utility';

/**
 * The answer as a zip (F3b, ADR-108):
 * - `README.md` holds the whole answer;
 * - every code block is its own file, named by the line above it when that
 *   line names one, else `snippet-N.<ext>` from its language;
 * - every table is `table-N.csv`.
 *
 * Paths come from the model, so they are cleaned before they reach the
 * archive. There are no absolute paths, no `..` and no backslashes, so
 * extracting the zip can never write outside its folder (zip-slip).
 */
export async function buildBundle(markdown: string, blocks: DocumentBlock[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const file of bundleFiles(markdown, blocks)) {
    zip.file(file.path, file.content);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export function bundleFiles(markdown: string, blocks: DocumentBlock[]): BundleFile[] {
  const files: BundleFile[] = [{ path: 'README.md', content: markdown }];
  const used = new Set<string>(['readme.md']);
  let hint: string | null = null;
  let snippets = 0;
  let tables = 0;
  for (const block of flattenBlocks(blocks)) {
    if (files.length >= ZIP_MAX_FILES) {
      break;
    }
    if (block.kind === BlockKind.CODE) {
      snippets += 1;
      const extension = CODE_LANGUAGE_EXTENSIONS[block.language?.toLowerCase() ?? ''] ?? 'txt';
      const fallback =
        extension === 'Dockerfile' ? 'Dockerfile' : `snippet-${String(snippets)}.${extension}`;
      files.push({
        path: unique(namedPath(hint, extension) ?? fallback, used),
        content: `${block.text}\n`,
      });
      hint = null;
    } else if (block.kind === BlockKind.TABLE) {
      tables += 1;
      files.push({ path: unique(`table-${String(tables)}.csv`, used), content: tableCsv(block) });
      hint = null;
    } else {
      const text = blockText(block).trim();
      hint = text.length > 0 && text.length <= ZIP_MAX_HINT_LENGTH ? text : null;
    }
  }
  return files;
}

/**
 * A relative path inside the archive named in `hint`, or null when there is
 * none or it is unsafe.
 */
export function safeBundlePath(hint: string | null): string | null {
  const named = hint === null ? null : namedFileInHint(hint.replaceAll('\\', '/'));
  if (named === null) {
    return null;
  }
  const segments = named.split('/').filter((segment) => segment.length > 0 && segment !== '.');
  return segments.length === 0 ||
    segments.some((segment) => segment === '..' || segment.startsWith('.'))
    ? null
    : segments.join('/');
}

/**
 * The first file name in `text` with up to ZIP_MAX_HINT_DIRECTORIES directories before it
 * ("lib/util.go", "../x.py", "lib.v1/app.py"). Same result as the old single regex
 * `([\w.-]+/){0,4}name`, but a directory is a deterministic run of path characters, so it is
 * walked in code and no regex repeats a group that itself repeats (CodeQL js/polynomial-redos).
 */
function namedFileInHint(text: string): string | null {
  for (let start = 0; start < text.length; start += 1) {
    const found = namedFileAt(text, start);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

function namedFileAt(text: string, start: number): string | null {
  const nameStarts = [start];
  let position = start;
  while (nameStarts.length <= ZIP_MAX_HINT_DIRECTORIES) {
    let end = position;
    while (end < text.length && ZIP_DIRECTORY_CHARACTER.test(text.charAt(end))) {
      end += 1;
    }
    if (end === position || text.charAt(end) !== '/') {
      break;
    }
    position = end + 1;
    nameStarts.push(position);
  }
  // Greedy like the regex: the most directories first, then fewer.
  for (const nameStart of [...nameStarts].reverse()) {
    ZIP_FILENAME_HINT.lastIndex = nameStart;
    const name = ZIP_FILENAME_HINT.exec(text);
    if (name !== null) {
      return text.slice(start, nameStart + name[0].length);
    }
  }
  return null;
}

/** The hinted path, when it names a file of this block's kind. */
function namedPath(hint: string | null, extension: string): string | null {
  const path = safeBundlePath(hint);
  if (path === null || extension === 'txt') {
    return path;
  }
  return path.toLowerCase().endsWith(`.${extension.toLowerCase()}`) || path === extension
    ? path
    : null;
}

function unique(path: string, used: Set<string>): string {
  let candidate = path;
  for (let copy = 2; used.has(candidate.toLowerCase()); copy += 1) {
    const dot = path.lastIndexOf('.');
    candidate =
      dot > 0
        ? `${path.slice(0, dot)}-${String(copy)}${path.slice(dot)}`
        : `${path}-${String(copy)}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function tableCsv(table: TableBlock): string {
  return stringify(tableRows(table).map((row) => row.map(csvSafeCell)));
}
