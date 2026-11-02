// Text from an office document held only in memory (DOCX, XLSX, PPTX, RTF).
//
// Used by the stateless extract-text read, where nothing may be stored. The two
// OOXML readers open a ZIP by path, so those bytes are written to a private
// temporary folder for the length of one parse and the folder is removed in
// every outcome. Bounds are the parsers' own (ADR-053, ADR-095).

import * as fsp from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DOCUMENT_TEXT_EXTENSIONS,
  DOCUMENT_TEXT_MAX_CHARS,
} from '../../modules/files/constants/extract-text.constants';
import {
  extractTextFromDocxBounded,
  extractTextFromPptx,
  extractTextFromXlsx,
} from './ooxml-parser.utility';
import { extractTextFromRtf } from './rtf-parser.utility';

export function documentTextExtension(filename: string): string | undefined {
  const lower = filename.toLowerCase();
  return DOCUMENT_TEXT_EXTENSIONS.find((extension) => lower.endsWith(extension));
}

async function withTemporaryFile<T>(
  extension: string,
  buffer: Buffer,
  read: (filePath: string) => Promise<T>,
): Promise<T> {
  const directory = await fsp.mkdtemp(join(tmpdir(), 'claw-extract-'));
  try {
    const filePath = join(directory, `document${extension}`);
    await fsp.writeFile(filePath, buffer, { mode: 0o600 });
    return await read(filePath);
  } finally {
    await fsp.rm(directory, { recursive: true, force: true });
  }
}

async function readDocumentText(extension: string, buffer: Buffer): Promise<string> {
  switch (extension) {
    case '.docx':
      return withTemporaryFile(extension, buffer, extractTextFromDocxBounded);
    case '.rtf':
      return extractTextFromRtf(buffer);
    case '.xlsx':
      return withTemporaryFile(extension, buffer, extractTextFromXlsx);
    case '.pptx':
      return withTemporaryFile(extension, buffer, extractTextFromPptx);
    default:
      throw new Error(`No document reader for ${extension}`);
  }
}

export function capDocumentText(text: string): string {
  if (text.length <= DOCUMENT_TEXT_MAX_CHARS) {
    return text;
  }
  const cut = text.lastIndexOf('\n', DOCUMENT_TEXT_MAX_CHARS);
  const kept = text.slice(0, cut > 0 ? cut : DOCUMENT_TEXT_MAX_CHARS);
  return `${kept}\n[Text cut: the document is longer than ${String(DOCUMENT_TEXT_MAX_CHARS)} characters]`;
}

export async function extractTextFromDocument(extension: string, buffer: Buffer): Promise<string> {
  return capDocumentText(await readDocumentText(extension, buffer));
}
