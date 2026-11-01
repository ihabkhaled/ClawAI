// An uploaded DOCX is read by the bounded OOXML reader, never by mammoth (which
// inflates with no caps). These tests drive FileProcessingManager.processFile
// against a real ZIP on disk, so the check and the read are the production ones.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { afterAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { FileProcessingManager } from '../file-processing.manager';
import { type ZipExpansionManager } from '../zip-expansion.manager';
import { type FilesRepository } from '../../repositories/files.repository';
import { type FileChunksRepository } from '../../repositories/file-chunks.repository';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import { OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES } from '../../constants/ooxml.constants';

vi.mock('../../../../common/utilities', () => ({
  readFile: vi.fn(() => Buffer.from('docx-bytes')),
}));
// The dependency is gone from package.json; the mock only proves nothing reaches
// for it, so it must not need the package to resolve.
const mammoth = vi.hoisted(() => ({ extractRawText: vi.fn() }));
vi.mock('mammoth', () => ({ default: mammoth }));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn(() => ({ OCR_ENABLED: false })) },
}));

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TIME_BUDGET_MS = 3000;
const directories: string[] = [];

// Minimal ZIP writer (deflate), one record per [name, content] pair, so a repeated
// name can be written directly.
function buildZip(parts: [string, string][]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of parts) {
    const data = Buffer.from(content, 'utf8');
    const packed = zlib.deflateRawSync(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, packed);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + packed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(parts.length, 8);
  end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

function docxOnDisk(parts: [string, string][]): File {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-upload-spec-'));
  directories.push(directory);
  const storagePath = path.join(directory, 'upload.docx');
  fs.writeFileSync(storagePath, buildZip(parts));
  return {
    id: 'docx-1',
    userId: 'user-1',
    filename: 'a.docx',
    mimeType: DOCX_MIME,
    storagePath,
  } as File;
}

const bodyOf = (inner: string): string =>
  `<?xml version="1.0"?><w:document><w:body>${inner}</w:body></w:document>`;
const paragraph = (text: string): string => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;

const harness = () => {
  const filesRepository = {
    updateIngestionStatus: vi.fn().mockResolvedValue(undefined),
    saveExtractionResult: vi.fn().mockResolvedValue(undefined),
  };
  const manager = new FileProcessingManager(
    filesRepository as unknown as FilesRepository,
    { createMany: vi.fn().mockResolvedValue(undefined) } as unknown as FileChunksRepository,
    { publish: vi.fn().mockResolvedValue(undefined) } as unknown as RabbitMQService,
    {} as unknown as ZipExpansionManager,
  );
  return { manager, filesRepository };
};

const saved = (repo: { saveExtractionResult: unknown }): Record<string, unknown> | undefined =>
  (repo.saveExtractionResult as Mock).mock.calls[0]?.[1] as Record<string, unknown> | undefined;

describe('FileProcessingManager - DOCX upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    for (const directory of directories) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('stores the paragraphs of a normal document and never calls mammoth', async () => {
    const h = harness();
    const file = docxOnDisk([
      ['word/document.xml', bodyOf(paragraph('Launch plan') + paragraph('Owner: Dana'))],
    ]);

    await h.manager.processFile(file);

    expect(saved(h.filesRepository)).toEqual({
      extractedText: 'Launch plan\nOwner: Dana',
      extractionError: null,
      status: FileIngestionStatus.COMPLETED,
    });
    expect(mammoth.extractRawText).not.toHaveBeenCalled();
  });

  it('reads table cells and decodes entities', async () => {
    const h = harness();
    const table = `<w:tbl><w:tr><w:tc>${paragraph('R&amp;D')}</w:tc><w:tc>${paragraph('1250 &lt; 2000')}</w:tc></w:tr></w:tbl>`;
    const file = docxOnDisk([['word/document.xml', bodyOf(table)]]);

    await h.manager.processFile(file);

    expect(saved(h.filesRepository)).toMatchObject({
      extractedText: 'R&D\n1250 < 2000',
      status: FileIngestionStatus.COMPLETED,
    });
  });

  it('fails a body part that inflates past the per-entry cap', async () => {
    const h = harness();
    const file = docxOnDisk([
      ['word/document.xml', 'A'.repeat(OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES + 1024)],
    ]);

    await h.manager.processFile(file);

    expect(saved(h.filesRepository)).toMatchObject({
      extractedText: null,
      status: FileIngestionStatus.FAILED,
    });
    expect(String(saved(h.filesRepository)?.extractionError)).toMatch(/limit/);
    expect(mammoth.extractRawText).not.toHaveBeenCalled();
  });

  it('fails an archive that repeats the body part name', async () => {
    const h = harness();
    const file = docxOnDisk([
      ['word/document.xml', bodyOf(paragraph('shown to the check'))],
      ['word/document.xml', bodyOf(paragraph('hidden from the check'))],
    ]);

    await h.manager.processFile(file);

    expect(saved(h.filesRepository)).toMatchObject({
      extractedText: null,
      extractionError: 'Archive repeats an entry name',
      status: FileIngestionStatus.FAILED,
    });
  });

  it('reads 600,000 unclosed openers in linear time', async () => {
    const h = harness();
    const file = docxOnDisk([['word/document.xml', bodyOf('<w:p>'.repeat(600_000))]]);

    const started = Date.now();
    await h.manager.processFile(file);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(TIME_BUDGET_MS);
    expect(saved(h.filesRepository)).toMatchObject({ status: FileIngestionStatus.COMPLETED });
  });
});
