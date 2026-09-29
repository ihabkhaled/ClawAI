import { vi } from 'vitest';

import { FilesService } from '../files.service';
import { type ExtractTextDto } from '../../dto/extract-text.dto';
import { extractTextFromPdf } from '../../../../common/utilities/pdf-parser.utility';

// Hoisted above the imports by vitest whatever their position here, so the
// spy is created inside the factory and read back through `vi.mocked` rather
// than closed over — a top-level variable would be touched before it exists.
vi.mock('../../../../common/utilities/pdf-parser.utility', () => ({
  extractTextFromPdf: vi.fn(),
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ SCANNED_PDF_CHAR_THRESHOLD: 100 }) },
}));

const parse = vi.mocked(extractTextFromPdf);

// Every collaborator is absent on purpose: this path must not reach a
// repository, the queue or storage, so a test that gave it one could not tell
// whether it stayed away from them.
const service = (): FilesService =>
  new FilesService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never);

const request = (overrides: Partial<ExtractTextDto> = {}): ExtractTextDto => ({
  filename: 'handbook.pdf',
  contentBase64: Buffer.from('%PDF-1.7').toString('base64'),
  ...overrides,
});

/**
 * Reading a workspace PDF is not an upload.
 *
 * The coding agent reads files the user already has. Storing a copy would put
 * repository content in their file list and their storage, which is not what
 * "read this file" means — so this path writes no row, publishes no event and
 * keeps no bytes.
 */
describe('FilesService.extractText', () => {
  beforeEach(() => {
    parse.mockReset();
    parse.mockResolvedValue({
      text: 'page four',
      isScanned: false,
      pages: [{ number: 4, text: 'page four' }],
      totalPages: 12,
    });
  });

  it('passes the page range straight through', async () => {
    await service().extractText(request({ pages: { from: 4, to: 6 } }));

    expect(parse.mock.calls[0]?.[2]).toEqual({ from: 4, to: 6 });
  });

  it('asks for the whole document when no range is given', async () => {
    await service().extractText(request());

    expect(parse.mock.calls[0]?.[2]).toBeUndefined();
  });

  it('returns the pages with their own numbers, and the document total', async () => {
    const result = await service().extractText(request({ pages: { from: 4, to: 6 } }));

    expect(result.pages).toEqual([{ number: 4, text: 'page four' }]);
    expect(result.totalPages).toBe(12);
  });

  it('reports a scanned document rather than calling it empty', async () => {
    // An agent that reads "" cannot tell a blank page from a page whose text
    // is a picture, and will keep asking. A scanned PDF still has pages; they
    // simply carry no text layer.
    parse.mockResolvedValue({
      text: '',
      isScanned: true,
      pages: [
        { number: 1, text: '' },
        { number: 2, text: '  \n ' },
      ],
      totalPages: 2,
    });

    expect((await service().extractText(request())).isScanned).toBe(true);
  });

  it('does not call a short range of a real text PDF scanned', async () => {
    // Measured live: pages 2-3 of a text PDF came back with their text AND
    // isScanned true, because the utility's rule is "whole text under 100
    // characters", written for whole documents on upload. A range is short by
    // nature. Scanning is judged per page here instead.
    parse.mockResolvedValue({
      text: 'PAGE-TWO bravo\n\nPAGE-THREE charlie',
      isScanned: true,
      pages: [
        { number: 2, text: 'PAGE-TWO bravo and more words' },
        { number: 3, text: 'PAGE-THREE charlie and more words' },
      ],
      totalPages: 3,
    });

    const result = await service().extractText(request({ pages: { from: 2, to: 3 } }));

    expect(result.isScanned).toBe(false);
  });

  it('does not call a document scanned because one page is a picture', async () => {
    // A cover page that is an image is common; the rest of the document is
    // still readable text.
    parse.mockResolvedValue({
      text: 'body text of page two',
      isScanned: false,
      pages: [
        { number: 1, text: '' },
        { number: 2, text: 'body text of page two, which is ordinary prose' },
      ],
      totalPages: 2,
    });

    expect((await service().extractText(request())).isScanned).toBe(false);
  });

  it('calls nothing scanned when the range returned no pages at all', async () => {
    // A range past the last page. There is nothing to judge, and "scanned"
    // would send the agent looking for OCR it does not need.
    parse.mockResolvedValue({ text: '', isScanned: true, pages: [], totalPages: 3 });

    const result = await service().extractText(request({ pages: { from: 9, to: 10 } }));

    expect(result.isScanned).toBe(false);
  });

  it('refuses a format it cannot read, by name', async () => {
    await expect(service().extractText(request({ filename: 'notes.docx' }))).rejects.toThrow(
      /PDF/u,
    );
    expect(parse).not.toHaveBeenCalled();
  });

  it('refuses a payload that decodes to nothing', async () => {
    await expect(service().extractText(request({ contentBase64: '!!!!' }))).rejects.toThrow(
      /no bytes/u,
    );
  });
});
