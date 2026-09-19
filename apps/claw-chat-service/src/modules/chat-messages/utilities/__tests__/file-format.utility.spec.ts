import { describe, expect, it } from 'vitest';

import {
  detectRequestedFileFormat,
  fileWriterSystemPrompt,
  unwrapWholeCodeFence,
} from '../file-format.utility';

describe('detectRequestedFileFormat', () => {
  it.each([
    ['make me a spreadsheet of Q3 sales', 'XLSX'],
    ['export this to Excel', 'XLSX'],
    ['build a 5-slide deck about our roadmap', 'PPTX'],
    ['create a PowerPoint presentation', 'PPTX'],
    ['zip the project files for me', 'ZIP'],
    ['write a pdf report', 'PDF'],
    ['save it as a Word document', 'DOCX'],
    ['give me a docx', 'DOCX'],
    ['make a csv of users', 'CSV'],
    ['output a json file', 'JSON'],
    ['create a web page', 'HTML'],
    ['a markdown file please', 'MD'],
    ['create a text file', 'TXT'],
    // Whole words only: these used to become Word files and archives.
    ['create a file with my password rules', 'TXT'],
    ['a file for the deckhand schedule', 'TXT'],
    // The named target wins when several formats appear.
    ['turn this CSV into a spreadsheet', 'XLSX'],
    ['convert the pdf to a word document', 'DOCX'],
    ['make a pdf from this json', 'PDF'],
  ])('%j → %s', (prompt, format) => {
    expect(detectRequestedFileFormat(prompt)).toBe(format);
  });
});

describe('fileWriterSystemPrompt', () => {
  // The service renders Markdown with raw HTML escaped, so HTML tags from the
  // writer used to show up as text on the page.
  it('asks for Markdown, not raw HTML, for an HTML file', () => {
    expect(fileWriterSystemPrompt('HTML')).toContain('Do not write raw HTML');
  });

  it.each(['XLSX', 'PPTX', 'ZIP', 'PDF', 'DOCX', 'CSV', 'JSON', 'TXT', 'MD'])(
    'names the format and gives %s its own instruction',
    (format) => {
      const prompt = fileWriterSystemPrompt(format);
      expect(prompt).toContain(`${format} file`);
      expect(prompt.length).toBeGreaterThan(120);
    },
  );

  it('asks a zip writer to put each path above its block', () => {
    expect(fileWriterSystemPrompt('ZIP')).toContain(
      'relative path alone on the line directly above',
    );
  });
});

describe('unwrapWholeCodeFence', () => {
  it('unwraps an answer that is one fenced block', () => {
    expect(unwrapWholeCodeFence('```markdown\n# Title\n\ntext\n```', 'PDF')).toBe(
      '# Title\n\ntext',
    );
  });

  // The old regex matched the first fence anywhere and dropped the rest of the
  // document around it.
  it('keeps a document that merely contains a code block', () => {
    const doc = '# Guide\n\nRun this:\n\n```bash\nnpm start\n```\n\nThen open the app.';
    expect(unwrapWholeCodeFence(doc, 'PDF')).toBe(doc);
  });

  it('keeps two consecutive blocks together', () => {
    const two = '```ts\na\n```\n\n```ts\nb\n```';
    expect(unwrapWholeCodeFence(two, 'DOCX')).toBe(two);
  });

  it('never unwraps a zip: its fences are the files', () => {
    const one = '```py\nprint(1)\n```';
    expect(unwrapWholeCodeFence(one, 'ZIP')).toBe(one);
  });
});
