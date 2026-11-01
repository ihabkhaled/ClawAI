// Text from an office document held only in memory (DOCX, XLSX, PPTX, RTF).
//
// Used by the stateless extract-text read, where nothing may be stored. The two
// OOXML readers open a ZIP by path, so those bytes are written to a private
// temporary folder for the length of one parse and the folder is removed in
// every outcome. Bounds are the parsers' own (ADR-053, ADR-095).

import * as fsp from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DOCUMENT_TEXT_EXTENSIONS } from '../../modules/files/constants/extract-text.constants';
import { extractTextFromDocx } from './docx-parser.utility';
import { extractTextFromPptx, extractTextFromXlsx } from './ooxml-parser.utility';
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

export async function extractTextFromDocument(extension: string, buffer: Buffer): Promise<string> {
  switch (extension) {
    case '.docx':
      return extractTextFromDocx(buffer);
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
