import assert from 'node:assert/strict';
import test from 'node:test';

import JSZip from 'jszip';

import {
  FORMATS,
  checkFile,
  csvCells,
  modelTotals,
  promptFor,
  renderReport,
  summarize,
  titleProblems,
} from '../../scripts/qa-lab/file-matrix-checks.mjs';

const zipOf = async (files) => {
  const zip = new JSZip();
  for (const [name, body] of Object.entries(files)) zip.file(name, body);
  return zip.generateAsync({ type: 'nodebuffer' });
};

test('every format has a prompt that names it, and runs vary the topic', () => {
  for (const format of FORMATS) {
    assert.notEqual(promptFor(format, 0), promptFor(format, 1));
  }
  assert.match(promptFor('XLSX', 0), /excel/);
  assert.match(promptFor('PPTX', 0), /powerpoint/);
  assert.throws(() => promptFor('EXE', 0), /unknown format/);
});

test('PDF needs a header, a trailer and real size', async () => {
  const good = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(2048, 32), Buffer.from('\n%%EOF\n')]);
  assert.deepEqual(await checkFile('PDF', good), []);
  assert.deepEqual(await checkFile('PDF', Buffer.from('hello')), ['no %PDF- header', 'no %%EOF trailer', 'under 1 KB']);
});

test('office files are checked by their parts, not their extension', async () => {
  const para = '<w:p><w:r><w:t>x</w:t></w:r></w:p>';
  assert.deepEqual(await checkFile('DOCX', await zipOf({ 'word/document.xml': para.repeat(3) })), []);
  assert.deepEqual(await checkFile('DOCX', await zipOf({ 'a.txt': 'x' })), ['no word/document.xml']);

  const rows = '<row r="1"/><row r="2"/><row r="3"/>';
  assert.deepEqual(await checkFile('XLSX', await zipOf({ 'xl/worksheets/sheet1.xml': rows })), []);
  assert.deepEqual(
    await checkFile('XLSX', await zipOf({ 'xl/worksheets/sheet1.xml': `${rows}<c><f>SUM(A1)</f></c>` })),
    ['contains a formula'],
  );

  const deck = { 'ppt/slides/slide1.xml': '<p/>', 'ppt/slides/slide2.xml': '<p/>' };
  assert.deepEqual(await checkFile('PPTX', await zipOf(deck)), []);
  assert.deepEqual(await checkFile('PPTX', await zipOf({ 'ppt/slides/slide1.xml': '<p/>' })), ['1 slide(s)']);
});

test('a zip is refused when empty or when an entry escapes the folder', async () => {
  assert.deepEqual(await checkFile('ZIP', await zipOf({ 'app/main.py': 'print(1)' })), []);
  assert.deepEqual(await checkFile('ZIP', await zipOf({ '../evil.py': 'x' })), ['unsafe entry path']);
  assert.deepEqual(await checkFile('ZIP', Buffer.from('not a zip')).then((p) => p[0].startsWith('unreadable')), true);
});

test('text formats: JSON parses, CSV is rectangular, HTML is whole and script-free', async () => {
  assert.deepEqual(await checkFile('JSON', Buffer.from('[{"a":1}]')), []);
  assert.deepEqual(await checkFile('JSON', Buffer.from('{oops')), ['does not parse']);
  assert.deepEqual(await checkFile('JSON', Buffer.from('42')), ['not an object or array']);
  assert.deepEqual(await checkFile('JSON', Buffer.from('{"content":"Step 1..."}')), [
    'model wrote no JSON (wrapped text)',
  ]);

  assert.deepEqual(await checkFile('CSV', Buffer.from('a,b\n"x, y",2\n3,4\n')), []);
  assert.deepEqual(await checkFile('CSV', Buffer.from('a,b\n1,2,3\n3,4\n')), ['1 ragged row(s)']);

  assert.deepEqual(await checkFile('HTML', Buffer.from('<html><body>x</body></html>')), []);
  assert.deepEqual(await checkFile('HTML', Buffer.from('<html><script>x</script></html>')), ['contains a script']);

  assert.deepEqual(await checkFile('MD', Buffer.from('intro\n## Steps\n')), []);
  assert.deepEqual(await checkFile('MD', Buffer.from('#nospace')), ['no heading']);
  assert.deepEqual(await checkFile('TXT', Buffer.from('short')), ['under 80 characters']);
  assert.deepEqual(await checkFile('TXT', Buffer.alloc(0)), ['empty file']);
});

test('csvCells honours quotes and escaped quotes', () => {
  assert.deepEqual(csvCells('a,"b, c","say ""hi"""'), ['a', 'b, c', 'say "hi"']);
});

test('a placeholder title or filename is a problem (ADR-109)', () => {
  assert.deepEqual(titleProblems({ title: 'Garden plan', filename: 'Garden plan.pdf' }), []);
  assert.deepEqual(titleProblems({ title: null, filename: 'generated-1700000000000.pdf' }), [
    'no title',
    'placeholder filename',
  ]);
});

test('summary skips runs the stack lost and keeps the latest result of a re-run', () => {
  const results = [
    { model: 'm1', format: 'PDF', run: 0, pass: false, infra: true, writer: null, latencyMs: null, problems: ['error: → 502'] },
    { model: 'm1', format: 'PDF', run: 0, pass: false, writer: 'm1', latencyMs: 90, problems: ['download 500'] },
    { model: 'm1', format: 'PDF', run: 0, pass: true, writer: 'm1', latencyMs: 80, problems: [] },
  ];
  assert.deepEqual(summarize(results), [
    { model: 'm1', format: 'PDF', runs: 1, pass: 1, fallback: 0, failures: {}, medianMs: 80 },
  ]);
});

test('summary counts a fallback writer as a failure of the model under test', () => {
  const results = [
    { model: 'm1', format: 'PDF', run: 0, pass: true, writer: 'm1', latencyMs: 100, problems: [] },
    { model: 'm1', format: 'PDF', run: 1, pass: true, writer: 'm1', latencyMs: 300, problems: [] },
    { model: 'm1', format: 'PDF', run: 2, pass: false, writer: 'm2', latencyMs: 50, problems: ['written by m2'] },
    { model: 'm2', format: 'CSV', run: 0, pass: false, writer: null, latencyMs: null, problems: ['timed out'] },
  ];
  const rows = summarize(results);
  assert.deepEqual(rows.find((r) => r.model === 'm1'), {
    model: 'm1',
    format: 'PDF',
    runs: 3,
    pass: 2,
    fallback: 1,
    failures: { 'written by m2': 1 },
    medianMs: 200,
  });
  assert.deepEqual(modelTotals(rows).map((t) => t.model), ['m1', 'm2']);

  const report = renderReport(rows, { id: 'T', started: 'now', base: 'b', runs: 3, calls: 4 });
  assert.match(report, /\| m1 \| 2 \| 3 \| 67% \| 1 \|/);
  assert.match(report, /\*\*m2 \/ CSV\*\*: timed out ×1/);
});
