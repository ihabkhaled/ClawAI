import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { convertToCsv } from '../adapters/csv.adapter';
import { convertToPptx } from '../adapters/pptx.adapter';
import { convertToXlsx } from '../adapters/xlsx.adapter';
import { convertToZip } from '../adapters/zip.adapter';
import { documentMeta, parseMarkdownDocument } from '../utilities/markdown-document.utility';
import { slidesFor } from '../utilities/pptx-deck.utility';
import { csvSafeCell } from '../utilities/spreadsheet-cell.utility';
import { columnName, safeSheetName, sheetsFor } from '../utilities/xlsx-workbook.utility';
import { bundleFiles, safeBundlePath } from '../utilities/zip-bundle.utility';

const SALES = [
  '# Q3 report',
  '',
  '## Sales by region',
  '',
  '| Region | Units | Revenue | Note |',
  '|---|---:|---:|---|',
  '| North | 120 | 4500.50 | =HYPERLINK("http://evil","x") |',
  '| South | 007 | -12 | @SUM(A1) |',
  '',
  '## Costs',
  '',
  '| Item | Cost |',
  '|---|---|',
  '| Ads <b>&</b> | 300 |',
].join('\n');

const read = async (buffer: Buffer, path: string): Promise<string> =>
  (await (await JSZip.loadAsync(buffer)).file(path)?.async('string')) ?? '';

describe('csvSafeCell (formula injection)', () => {
  it.each([
    ['=HYPERLINK("http://evil","x")', `'=HYPERLINK("http://evil","x")`],
    ['+cmd|" /C calc"!A0', `'+cmd|" /C calc"!A0`],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['-2+3', "'-2+3"],
    ['\tTAB', "'\tTAB"],
    ['-12', '-12'],
    ['4500.50', '4500.50'],
    ['plain', 'plain'],
    ['', ''],
  ])('%j → %j', (value, expected) => {
    expect(csvSafeCell(value)).toBe(expected);
  });

  it('guards a CSV the model wrote itself, not only Markdown tables', () => {
    const csv = convertToCsv('name,formula\nx,=1+1\ny,-4\n').toString();
    expect(csv).toBe("name,formula\nx,'=1+1\ny,-4\n");
  });

  it('guards Markdown table cells', () => {
    expect(convertToCsv(SALES).toString()).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
  });
});

describe('Excel workbook', () => {
  it('makes a sheet per table, named by the heading above it', () => {
    const blocks = parseMarkdownDocument(SALES);
    const sheets = sheetsFor(blocks, documentMeta(blocks, null));
    expect(sheets.map((sheet) => sheet.name)).toEqual(['Sales by region', 'Costs']);
    expect(sheets[0]?.rows[0]).toEqual(['Region', 'Units', 'Revenue', 'Note']);
  });

  it('writes numbers as numbers, text as text, and never a formula', async () => {
    const xlsx = await convertToXlsx(SALES, null);
    const sheet = await read(xlsx, 'xl/worksheets/sheet1.xml');
    expect(xlsx.subarray(0, 2).toString()).toBe('PK');
    expect(sheet).toContain('<c r="B2"><v>120</v></c>');
    expect(sheet).toContain('<c r="C2"><v>4500.50</v></c>');
    expect(sheet).toContain('<c r="C3"><v>-12</v></c>');
    // "007" keeps its zeros: it is an id, not a number.
    expect(sheet).toContain('<t xml:space="preserve">007</t>');
    expect(sheet).toContain('=HYPERLINK(&quot;http://evil&quot;,&quot;x&quot;)');
    expect(sheet).not.toContain('<f>');
    expect(sheet).toContain('s="1"');
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('<autoFilter ref="A1:D3"/>');
    expect(await read(xlsx, 'xl/worksheets/sheet2.xml')).toContain('Ads &lt;b&gt;&amp;&lt;/b&gt;');
    expect(await read(xlsx, 'xl/workbook.xml')).toContain('name="Sales by region"');
    expect(await read(xlsx, 'docProps/core.xml')).toContain('<dc:title>Q3 report</dc:title>');
  });

  it('lays out a right-to-left table right to left', async () => {
    const xlsx = await convertToXlsx('| الاسم | الكمية |\n|---|---|\n| تفاح | 5 |', null);
    expect(await read(xlsx, 'xl/worksheets/sheet1.xml')).toContain('rightToLeft="1"');
  });

  it('puts the text on one sheet when the answer has no table', async () => {
    const xlsx = await convertToXlsx('# Notes\n\nFirst line.\n\nSecond line.', null);
    const sheet = await read(xlsx, 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('First line.');
    expect(sheet).not.toContain('frozen');
  });

  it('drops characters XML cannot hold', async () => {
    const xlsx = await convertToXlsx(`| a |\n|---|\n| x${String.fromCharCode(1)}y |`, null);
    expect(await read(xlsx, 'xl/worksheets/sheet1.xml')).toContain('>xy<');
  });

  it.each([
    ['Sales [2026]: Q3/Q4?', 'Sales  2026   Q3 Q4'],
    ["'quoted'", 'quoted'],
    ['', 'Sheet'],
    ['x'.repeat(40), 'x'.repeat(31)],
  ])('names sheet %j as %j', (name, expected) => {
    expect(safeSheetName(name)).toBe(expected);
  });

  it('keeps sheet names unique', () => {
    const blocks = parseMarkdownDocument(
      '## Data\n\n| a |\n|---|\n| 1 |\n\n## Data\n\n| b |\n|---|\n| 2 |',
    );
    expect(sheetsFor(blocks, documentMeta(blocks, null)).map((sheet) => sheet.name)).toEqual([
      'Data',
      'Data (2)',
    ]);
  });

  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [701, 'ZZ'],
    [702, 'AAA'],
  ])('column %i is %s', (index, name) => {
    expect(columnName(index)).toBe(name);
  });
});

describe('slide deck', () => {
  // A heading right before a table is that table's slide, not an empty one.
  it('turns headings into slides and skips the title heading', () => {
    const blocks = parseMarkdownDocument(SALES);
    const slides = slidesFor(blocks, documentMeta(blocks, null));
    expect(slides.map((slide) => slide.title)).toEqual(['Sales by region', 'Costs']);
    expect(slides[0]?.table?.[0]).toEqual(['Region', 'Units', 'Revenue', 'Note']);
  });

  it('continues long sections on another slide instead of overflowing', () => {
    const bullets = Array.from({ length: 20 }, (_, index) => `- point ${String(index)}`).join('\n');
    const blocks = parseMarkdownDocument(`# Deck\n\n## Agenda\n\n${bullets}`);
    const slides = slidesFor(blocks, documentMeta(blocks, null));
    expect(slides.map((slide) => slide.title)).toEqual([
      'Agenda',
      'Agenda (cont.)',
      'Agenda (cont.)',
    ]);
    expect(slides.flatMap((slide) => slide.lines)).toHaveLength(20);
  });

  it('writes a PowerPoint file with every slide', async () => {
    const pptx = await convertToPptx(SALES, null);
    const zip = await JSZip.loadAsync(pptx);
    const slides = Object.keys(zip.files).filter((path) =>
      /^ppt\/slides\/slide\d+\.xml$/u.test(path),
    );
    expect(pptx.subarray(0, 2).toString()).toBe('PK');
    expect(slides).toHaveLength(3);
    expect(await read(pptx, 'ppt/slides/slide2.xml')).toContain('North');
  });

  it('marks right-to-left text right to left', async () => {
    const pptx = await convertToPptx('# عرض\n\n## الأهداف\n\n- زيادة المبيعات', null);
    expect(await read(pptx, 'ppt/slides/slide2.xml')).toContain('rtl="1"');
  });
});

describe('zip bundle', () => {
  const ANSWER = [
    '# Starter',
    '',
    'Create `src/app.ts`:',
    '',
    '```ts',
    'export const app = 1;',
    '```',
    '',
    'Then open index.html in a browser:',
    '',
    '```bash',
    'npm start',
    '```',
    '',
    '```python',
    'print(1)',
    '```',
    '',
    '| k | v |',
    '|---|---|',
    '| a | =1+1 |',
  ].join('\n');

  it('names code by the line above it, else by its language', () => {
    const files = bundleFiles(ANSWER, parseMarkdownDocument(ANSWER));
    expect(files.map((file) => file.path)).toEqual([
      'README.md',
      'src/app.ts',
      'snippet-2.sh',
      'snippet-3.py',
      'table-1.csv',
    ]);
    expect(files[4]?.content).toBe("k,v\na,'=1+1\n");
  });

  // Zip-slip: nothing from the model may point outside the archive's folder.
  it.each([
    ['../../etc/cron.d/x.sh', null],
    ['src/../../evil.py', null],
    ['/etc/app.py', 'etc/app.py'],
    ['C:\\Windows\\win.ini', 'Windows/win.ini'],
    // A leading dot is dropped, so no hidden file is created.
    ['.env.py', 'env.py'],
    ['no file here', null],
    ['see `lib/util.go`', 'lib/util.go'],
  ])('hint %j → %j', (hint, expected) => {
    expect(safeBundlePath(hint)).toBe(expected);
  });

  it('never names two files the same', () => {
    const answer = 'app.py\n\n```python\na\n```\n\napp.py\n\n```python\nb\n```';
    expect(bundleFiles(answer, parseMarkdownDocument(answer)).map((file) => file.path)).toEqual([
      'README.md',
      'app.py',
      'app-2.py',
    ]);
  });

  it('writes a real zip with the answer as README', async () => {
    const zip = await JSZip.loadAsync(await convertToZip(ANSWER));
    expect(await zip.file('README.md')?.async('string')).toBe(ANSWER);
    expect(await zip.file('src/app.ts')?.async('string')).toBe('export const app = 1;\n');
    expect(Object.keys(zip.files).some((path) => path.includes('..'))).toBe(false);
  });
});
