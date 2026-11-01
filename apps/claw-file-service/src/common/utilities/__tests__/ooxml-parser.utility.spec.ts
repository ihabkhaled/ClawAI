import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import {
  extractTextFromDocxBounded,
  extractTextFromPptx,
  extractTextFromXlsx,
} from '../ooxml-parser.utility';
import {
  OOXML_MAX_ENTRY_COUNT,
  OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES,
  XLSX_SHARED_STRINGS_ENTRY,
} from '../../../modules/files/constants/ooxml.constants';

// Builds a real (stored-deflate) ZIP so the parser is exercised against the
// same container format Office writes, not against a mock.
function buildZip(files: Record<string, string>): Buffer {
  const localChunks: Buffer[] = [];
  const entries: {
    nameBuf: Buffer;
    crc: number;
    csize: number;
    usize: number;
    offset: number;
  }[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, 'utf8');
    const deflated = zlib.deflateRawSync(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    localChunks.push(local, nameBuf, deflated);
    entries.push({
      nameBuf,
      crc: crc32(data),
      csize: deflated.length,
      usize: data.length,
      offset,
    });
    offset += local.length + nameBuf.length + deflated.length;
  }

  const centralChunks: Buffer[] = [];
  let centralSize = 0;
  for (const entry of entries) {
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(8, 10);
    header.writeUInt32LE(entry.crc, 16);
    header.writeUInt32LE(entry.csize, 20);
    header.writeUInt32LE(entry.usize, 24);
    header.writeUInt16LE(entry.nameBuf.length, 28);
    header.writeUInt32LE(entry.offset, 42);
    centralChunks.push(header, entry.nameBuf);
    centralSize += header.length + entry.nameBuf.length;
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localChunks, ...centralChunks, end]);
}

let crcTable: Int32Array | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (const byte of buf) {
    c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function writeTempZip(files: Record<string, string>, suffix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ooxml-spec-'));
  const filePath = path.join(dir, `fixture${suffix}`);
  fs.writeFileSync(filePath, buildZip(files));
  return filePath;
}

const XLSX_FIXTURE: Record<string, string> = {
  'xl/sharedStrings.xml':
    '<?xml version="1.0"?><sst><si><t>Region</t></si><si><t>Revenue</t></si><si><t>EMEA</t></si><si><t>Ampersand &amp; Co</t></si></sst>',
  'xl/workbook.xml':
    '<?xml version="1.0"?><workbook><sheets><sheet name="Q3 Revenue" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/worksheets/sheet1.xml':
    '<?xml version="1.0"?><worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>1284000</v></c></row>' +
    '<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3" t="inlineStr"><is><t>inline value</t></is></c></row>' +
    '</sheetData></worksheet>',
};

const PPTX_FIXTURE: Record<string, string> = {
  'ppt/slides/slide1.xml':
    '<?xml version="1.0"?><p:sld><p:cSld><p:spTree><p:sp><p:txBody>' +
    '<a:p><a:r><a:t>Roadmap</a:t></a:r></a:p>' +
    '<a:p><a:r><a:t>Local-first</a:t></a:r><a:r><a:t> inference</a:t></a:r></a:p>' +
    '</p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
  'ppt/slides/slide2.xml':
    '<?xml version="1.0"?><p:sld><p:cSld><p:spTree><p:sp><p:txBody>' +
    '<a:p><a:r><a:t>Targets</a:t></a:r></a:p>' +
    '</p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
  'ppt/notesSlides/notesSlide1.xml':
    '<?xml version="1.0"?><p:notes><a:p><a:r><a:t>Speaker note one</a:t></a:r></a:p></p:notes>',
};

describe('ooxml-parser.utility', () => {
  const created: string[] = [];

  afterAll(() => {
    for (const filePath of created) {
      fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
    }
  });

  function fixture(files: Record<string, string>, suffix: string): string {
    const filePath = writeTempZip(files, suffix);
    created.push(filePath);
    return filePath;
  }

  describe('extractTextFromXlsx', () => {
    it('resolves shared strings into readable cell values', async () => {
      const text = await extractTextFromXlsx(fixture(XLSX_FIXTURE, '.xlsx'));

      expect(text).toContain('Region');
      expect(text).toContain('Revenue');
      expect(text).toContain('EMEA');
    });

    it('keeps numeric cells that carry no shared-string index', async () => {
      const text = await extractTextFromXlsx(fixture(XLSX_FIXTURE, '.xlsx'));

      expect(text).toContain('1284000');
    });

    it('reads inline strings', async () => {
      const text = await extractTextFromXlsx(fixture(XLSX_FIXTURE, '.xlsx'));

      expect(text).toContain('inline value');
    });

    it('decodes XML entities rather than leaking markup', async () => {
      const text = await extractTextFromXlsx(fixture(XLSX_FIXTURE, '.xlsx'));

      expect(text).toContain('Ampersand & Co');
      expect(text).not.toContain('&amp;');
    });

    it('names the sheet so a model can cite it', async () => {
      const text = await extractTextFromXlsx(fixture(XLSX_FIXTURE, '.xlsx'));

      expect(text).toContain('Q3 Revenue');
    });

    it('keeps one row per line so tabular structure survives', async () => {
      const text = await extractTextFromXlsx(fixture(XLSX_FIXTURE, '.xlsx'));
      const dataLine = text.split('\n').find((line) => line.includes('EMEA'));

      expect(dataLine).toContain('1284000');
    });

    it('returns empty text for a workbook with no sheets rather than throwing', async () => {
      const text = await extractTextFromXlsx(
        fixture({ 'xl/workbook.xml': '<workbook/>' }, '.xlsx'),
      );

      expect(text).toBe('');
    });
  });

  describe('extractTextFromPptx', () => {
    it('extracts text from every slide', async () => {
      const text = await extractTextFromPptx(fixture(PPTX_FIXTURE, '.pptx'));

      expect(text).toContain('Roadmap');
      expect(text).toContain('Targets');
    });

    it('joins runs inside one paragraph without inserting a break', async () => {
      const text = await extractTextFromPptx(fixture(PPTX_FIXTURE, '.pptx'));

      expect(text).toContain('Local-first inference');
    });

    it('includes speaker notes', async () => {
      const text = await extractTextFromPptx(fixture(PPTX_FIXTURE, '.pptx'));

      expect(text).toContain('Speaker note one');
    });

    it('orders slides numerically, not lexicographically', async () => {
      const files: Record<string, string> = {};
      for (const index of [1, 2, 10]) {
        files[`ppt/slides/slide${String(index)}.xml`] =
          `<p:sld><a:p><a:r><a:t>slide-${String(index)}</a:t></a:r></a:p></p:sld>`;
      }
      const text = await extractTextFromPptx(fixture(files, '.pptx'));

      expect(text.indexOf('slide-2')).toBeLessThan(text.indexOf('slide-10'));
    });

    it('returns empty text for a deck with no slides rather than throwing', async () => {
      const text = await extractTextFromPptx(fixture({ 'ppt/presentation.xml': '<p/>' }, '.pptx'));

      expect(text).toBe('');
    });
  });

  // An .xlsx is a ZIP and is user input. These bounds are the OOXML half of the
  // archive policy in ADR-053; without them this file would be a second, ungated
  // way to open an attacker-supplied archive.
  describe('archive bounds', () => {
    it('refuses a workbook whose entry count is implausible', async () => {
      const files: Record<string, string> = {};
      for (let i = 0; i < OOXML_MAX_ENTRY_COUNT + 1; i++) {
        files[`xl/worksheets/sheet${String(i + 1)}.xml`] = '<worksheet/>';
      }

      await expect(extractTextFromXlsx(fixture(files, '.xlsx'))).rejects.toThrow(/limit 5000/);
    });

    it('refuses a deck whose entry count is implausible', async () => {
      const files: Record<string, string> = {};
      for (let i = 0; i < OOXML_MAX_ENTRY_COUNT + 1; i++) {
        files[`ppt/slides/slide${String(i + 1)}.xml`] = '<p:sld/>';
      }

      await expect(extractTextFromPptx(fixture(files, '.pptx'))).rejects.toThrow(/limit 5000/);
    });

    it('refuses an entry that inflates past the per-entry cap', async () => {
      // Highly compressible: a few KB on disk, well over the cap inflated.
      const bomb = 'A'.repeat(OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES + 1024);

      await expect(
        extractTextFromXlsx(fixture({ [XLSX_SHARED_STRINGS_ENTRY]: bomb }, '.xlsx')),
      ).rejects.toThrow(/OOXML_ENTRY_TOO_LARGE|bytes \(limit/);
    });
  });

  // Parts are user input, so the text pulled out of them must cost time in
  // proportion to their size. A lazy-body regex rescans to the end of the part for
  // every opener that never closes: 600,000 such openers (3 MB, far under the
  // size caps) ran for minutes before the scan was made forward-only.
  describe('crafted parts cost time in proportion to their size', () => {
    const budgetMs = 3000;
    const timed = async (read: () => Promise<string>): Promise<{ text: string; ms: number }> => {
      const started = Date.now();
      const text = await read();
      return { text, ms: Date.now() - started };
    };

    it('a document of unclosed paragraphs', async () => {
      const part = `<w:document><w:body>${'<w:p>'.repeat(600_000)}</w:body></w:document>`;

      const { text, ms } = await timed(() =>
        extractTextFromDocxBounded(fixture({ 'word/document.xml': part }, '.docx')),
      );

      expect(text).toBe('');
      expect(ms).toBeLessThan(budgetMs);
    });

    it('a paragraph full of text tags that never end', async () => {
      const part = `<w:p>${'<w:t '.repeat(600_000)}</w:p>`;

      const { text, ms } = await timed(() =>
        extractTextFromDocxBounded(fixture({ 'word/document.xml': part }, '.docx')),
      );

      expect(text).toBe('');
      expect(ms).toBeLessThan(budgetMs);
    });

    it('a worksheet of unclosed rows', async () => {
      const part = `<worksheet><sheetData>${'<row>'.repeat(600_000)}</sheetData></worksheet>`;

      const { text, ms } = await timed(() =>
        extractTextFromXlsx(fixture({ 'xl/worksheets/sheet1.xml': part }, '.xlsx')),
      );

      expect(text).toBe('');
      expect(ms).toBeLessThan(budgetMs);
    });

    it('a row of unclosed cells', async () => {
      const part = `<worksheet><sheetData><row>${'<c>'.repeat(600_000)}</row></sheetData></worksheet>`;

      const { ms } = await timed(() =>
        extractTextFromXlsx(fixture({ 'xl/worksheets/sheet1.xml': part }, '.xlsx')),
      );

      expect(ms).toBeLessThan(budgetMs);
    });

    it('a slide of unclosed paragraphs', async () => {
      const part = `<p:sld>${'<a:p>'.repeat(600_000)}</p:sld>`;

      const { text, ms } = await timed(() =>
        extractTextFromPptx(fixture({ 'ppt/slides/slide1.xml': part }, '.pptx')),
      );

      expect(text).toBe('');
      expect(ms).toBeLessThan(budgetMs);
    });

    it('a workbook of unclosed shared strings', async () => {
      const part = `<sst>${'<si>'.repeat(600_000)}</sst>`;
      const sheet =
        '<worksheet><sheetData><row><c t="s"><v>0</v></c></row></sheetData></worksheet>';

      const { ms } = await timed(() =>
        extractTextFromXlsx(
          fixture({ 'xl/sharedStrings.xml': part, 'xl/worksheets/sheet1.xml': sheet }, '.xlsx'),
        ),
      );

      expect(ms).toBeLessThan(budgetMs);
    });
  });

  // A DOCX is read here, not by mammoth (which inflates with no caps), through
  // the same bounded reader as the workbook and the deck.
  describe('extractTextFromDocxBounded', () => {
    const body = (paragraphs: string): string =>
      `<?xml version="1.0"?><w:document><w:body>${paragraphs}</w:body></w:document>`;
    const docx = (paragraphs: string): string =>
      fixture({ 'word/document.xml': body(paragraphs) }, '.docx');

    it('reads one line per paragraph and joins the runs inside one', async () => {
      const text = await extractTextFromDocxBounded(
        docx(
          '<w:p><w:r><w:t>Launch</w:t></w:r><w:r><w:t xml:space="preserve"> plan</w:t></w:r></w:p>' +
            '<w:p><w:r><w:t>Owner: Dana</w:t></w:r></w:p>',
        ),
      );

      expect(text).toBe('Launch plan\nOwner: Dana');
    });

    it('keeps tabs and line breaks and decodes entities', async () => {
      const text = await extractTextFromDocxBounded(
        docx('<w:p><w:r><w:t>A &amp; B</w:t><w:tab/><w:t>C</w:t><w:br/><w:t>D</w:t></w:r></w:p>'),
      );

      expect(text).toBe('A & B\tC\nD');
    });

    it('reads table cells as paragraphs', async () => {
      const text = await extractTextFromDocxBounded(
        docx(
          '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Q3</w:t></w:r></w:p></w:tc>' +
            '<w:tc><w:p><w:r><w:t>1250</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
        ),
      );

      expect(text).toBe('Q3\n1250');
    });

    it('is not swallowed by an empty self-closing text element', async () => {
      const text = await extractTextFromDocxBounded(
        docx('<w:p><w:r><w:t/></w:r><w:r><w:t>kept</w:t></w:r></w:p>'),
      );

      expect(text).toBe('kept');
    });

    it('skips a paragraph that holds no text', async () => {
      const text = await extractTextFromDocxBounded(
        docx('<w:p><w:pPr/></w:p><w:p><w:r><w:t>only</w:t></w:r></w:p>'),
      );

      expect(text).toBe('only');
    });

    it('returns empty text for an archive with no body part', async () => {
      await expect(
        extractTextFromDocxBounded(fixture({ 'word/styles.xml': '<w:styles/>' }, '.docx')),
      ).resolves.toBe('');
    });

    it('refuses an implausible entry count before reading anything', async () => {
      const files: Record<string, string> = {};
      for (let i = 0; i < OOXML_MAX_ENTRY_COUNT + 1; i++) {
        files[`word/part${String(i + 1)}.xml`] = '<x/>';
      }

      await expect(extractTextFromDocxBounded(fixture(files, '.docx'))).rejects.toThrow(
        /limit 5000/,
      );
    });

    it('refuses a body part that inflates past the per-entry cap', async () => {
      const bomb = 'A'.repeat(OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES + 1024);

      await expect(
        extractTextFromDocxBounded(fixture({ 'word/document.xml': bomb }, '.docx')),
      ).rejects.toThrow(/OOXML_ENTRY_TOO_LARGE|bytes \(limit/);
    });

    it('refuses an archive that repeats an entry name', async () => {
      // Two parts under one name are read differently by different zip libraries,
      // which is how a part hides from a check. Built as two names one letter
      // apart, then made equal in every header.
      const first = body('<w:p><w:r><w:t>one</w:t></w:r></w:p>');
      const second = body('<w:p><w:r><w:t>two</w:t></w:r></w:p>');
      const filePath = fixture(
        { 'word/document.xml': first, 'word/document.xmm': second },
        '.docx',
      );
      const archive = fs.readFileSync(filePath);
      const needle = Buffer.from('word/document.xmm');
      const same = Buffer.from('word/document.xml');
      for (let at = archive.indexOf(needle); at !== -1; at = archive.indexOf(needle, at + 1)) {
        same.copy(archive, at);
      }
      fs.writeFileSync(filePath, archive);

      await expect(extractTextFromDocxBounded(filePath)).rejects.toThrow(/repeats an entry name/);
    });
  });
});
