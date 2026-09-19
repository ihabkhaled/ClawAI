// F4 file-model matrix: the pure half. Prompts, per-format file checks,
// scoring and the report. No network here, so every rule is unit-tested
// (tools/__tests__/file-matrix-checks.test.mjs).
import JSZip from 'jszip';

export const FORMATS = ['PDF', 'DOCX', 'HTML', 'MD', 'TXT', 'CSV', 'JSON', 'XLSX', 'PPTX', 'ZIP'];

// Ten topics so ten runs of one format are ten different documents, not one
// cached answer measured ten times.
export const TOPICS = [
  'onboarding a new backend engineer',
  'preparing for a job interview',
  'planning a small vegetable garden',
  'saving money on groceries',
  'running a weekly team meeting',
  'learning basic Arabic phrases',
  'securing a home Wi-Fi network',
  'training for a first 5 km run',
  'writing a clear bug report',
  'packing for a week-long trip',
];

// Each phrase names its format the way a user does, and chat's
// detectRequestedFileFormat must map it back. A wrong format is a failure.
const REQUESTS = {
  PDF: (t) => `make me a pdf with a one-page guide to ${t}`,
  DOCX: (t) => `write a word document with a short checklist for ${t}`,
  HTML: (t) => `make me an html page with tips for ${t}`,
  MD: (t) => `make me a markdown file with notes on ${t}`,
  TXT: (t) => `make me a txt file with five plain tips for ${t}`,
  CSV: (t) => `make me a csv file with a 6-row task table for ${t}, with columns step, owner and days`,
  JSON: (t) => `make me a json file listing 5 steps for ${t}, each with a title and minutes`,
  XLSX: (t) => `make me an excel spreadsheet with a 6-row plan for ${t}, with columns task, owner and hours`,
  PPTX: (t) => `make me a powerpoint deck of 4 slides about ${t}`,
  ZIP: (t) => `make me a zip of a tiny python project that prints three tips for ${t}, with a readme`,
};

export function promptFor(format, run) {
  const request = REQUESTS[format];
  if (!request) throw new Error(`unknown format ${format}`);
  return request(TOPICS[run % TOPICS.length]);
}

const utf8 = (buf) => Buffer.from(buf).toString('utf8');

/** Splits one CSV line, honouring double-quoted cells. */
export function csvCells(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted && ch === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

async function zipEntries(buf) {
  const zip = await JSZip.loadAsync(buf);
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  // JSZip normalises "../" away on load; the name as written is what a
  // careless unzip would use, so that is the one checked.
  return { zip, names: entries.map((f) => f.name), raw: entries.map((f) => f.unsafeOriginalName ?? f.name) };
}

const CHECKS = {
  PDF: async (buf) => {
    const head = utf8(buf.subarray(0, 5));
    const tail = utf8(buf.subarray(Math.max(0, buf.length - 64)));
    const problems = [];
    if (head !== '%PDF-') problems.push('no %PDF- header');
    if (!tail.includes('%%EOF')) problems.push('no %%EOF trailer');
    if (buf.length < 1024) problems.push('under 1 KB');
    return problems;
  },
  DOCX: async (buf) => {
    const { zip, names } = await zipEntries(buf);
    if (!names.includes('word/document.xml')) return ['no word/document.xml'];
    const xml = await zip.file('word/document.xml').async('string');
    return (xml.match(/<w:p[ >]/g) ?? []).length < 3 ? ['fewer than 3 paragraphs'] : [];
  },
  XLSX: async (buf) => {
    const { zip, names } = await zipEntries(buf);
    const sheet = names.find((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
    if (!sheet) return ['no worksheet'];
    const xml = await zip.file(sheet).async('string');
    const problems = [];
    if ((xml.match(/<row[ >]/g) ?? []).length < 3) problems.push('fewer than 3 rows');
    if (/<f[ >]/.test(xml)) problems.push('contains a formula');
    return problems;
  },
  PPTX: async (buf) => {
    const { names } = await zipEntries(buf);
    const slides = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
    return slides < 2 ? [`${slides} slide(s)`] : [];
  },
  ZIP: async (buf) => {
    const { names, raw } = await zipEntries(buf);
    const problems = [];
    if (names.length === 0) problems.push('empty archive');
    if (raw.some((n) => n.startsWith('/') || n.split(/[\\/]/).includes('..'))) {
      problems.push('unsafe entry path');
    }
    return problems;
  },
  JSON: async (buf) => {
    try {
      const value = JSON.parse(utf8(buf));
      if (value === null || typeof value !== 'object') return ['not an object or array'];
      // file-generation wraps text that is not JSON as {"content": "…"}: a
      // valid file, but the model did not write JSON.
      const keys = Object.keys(value);
      return keys.length === 1 && keys[0] === 'content' && typeof value.content === 'string'
        ? ['model wrote no JSON (wrapped text)']
        : [];
    } catch {
      return ['does not parse'];
    }
  },
  CSV: async (buf) => {
    const lines = utf8(buf).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length < 3) return ['fewer than 3 lines'];
    const width = csvCells(lines[0]).length;
    if (width < 2) return ['one column'];
    const ragged = lines.filter((l) => csvCells(l).length !== width).length;
    return ragged > 0 ? [`${ragged} ragged row(s)`] : [];
  },
  HTML: async (buf) => {
    const text = utf8(buf).toLowerCase();
    const problems = [];
    if (!text.includes('<html') || !text.includes('</html>')) problems.push('not a whole html document');
    if (text.includes('<script')) problems.push('contains a script');
    return problems;
  },
  MD: async (buf) => (/^#{1,6} \S/m.test(utf8(buf)) ? [] : ['no heading']),
  TXT: async (buf) => {
    const text = utf8(buf).trim();
    return text.length < 80 ? ['under 80 characters'] : [];
  },
};

/** Problems with a downloaded file; an empty list means it is a real file of that format. */
export async function checkFile(format, buf) {
  const check = CHECKS[format];
  if (!check) return [`unknown format ${format}`];
  if (!buf || buf.length === 0) return ['empty file'];
  try {
    return await check(Buffer.from(buf));
  } catch (error) {
    return [`unreadable: ${error.message}`];
  }
}

/** A name the service made up is not a title (ADR-109). */
export function titleProblems(generation) {
  const problems = [];
  if (!generation.title || generation.title === 'Document') problems.push('no title');
  if (/^generated-\d+/.test(generation.filename ?? '')) problems.push('placeholder filename');
  return problems;
}

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
};

/**
 * One row per model × format. `pass` needs the file to be valid AND written by
 * the model under test; a fallback writer's success is not that model's.
 * Runs marked `infra` are left out.
 */
export function summarize(results) {
  const rows = new Map();
  // A run the stack lost (an API 5xx, a refused connection) says nothing
  // about the model, so it is not scored. A resumed run appends, so only the
  // latest scored result of each model × format × run counts.
  const latest = new Map();
  for (const r of results) {
    if (!r.infra) latest.set(`${r.model}\u0000${r.format}\u0000${r.run}`, r);
  }
  for (const r of latest.values()) {
    const key = `${r.model}\u0000${r.format}`;
    const row = rows.get(key) ?? { model: r.model, format: r.format, runs: 0, pass: 0, fallback: 0, failures: {}, latencies: [] };
    row.runs++;
    if (r.writer && r.writer !== r.model) row.fallback++;
    if (r.pass) {
      row.pass++;
      row.latencies.push(r.latencyMs);
    }
    for (const p of r.problems) row.failures[p] = (row.failures[p] ?? 0) + 1;
    rows.set(key, row);
  }
  return [...rows.values()].map(({ latencies, ...row }) => ({ ...row, medianMs: median(latencies) }));
}

export function modelTotals(rows) {
  const totals = new Map();
  for (const row of rows) {
    const t = totals.get(row.model) ?? { model: row.model, runs: 0, pass: 0, fallback: 0 };
    t.runs += row.runs;
    t.pass += row.pass;
    t.fallback += row.fallback;
    totals.set(row.model, t);
  }
  return [...totals.values()].sort((a, b) => b.pass / b.runs - a.pass / a.runs || a.model.localeCompare(b.model));
}

const pct = (n, d) => (d === 0 ? '—' : `${Math.round((100 * n) / d)}%`);

export function renderReport(rows, meta) {
  const models = modelTotals(rows);
  const formats = FORMATS.filter((f) => rows.some((r) => r.format === f));
  const cell = (model, format) => {
    const row = rows.find((r) => r.model === model && r.format === format);
    return row ? `${row.pass}/${row.runs}` : '—';
  };
  const lines = [
    `# File-model matrix — ${meta.id}`,
    '',
    `${meta.started} · ${meta.base} · ${meta.runs} run(s) per model × format · ${meta.calls} writer call(s)`,
    '',
    '## By model',
    '',
    '| Model | Pass | Runs | Rate | Fallback writer |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...models.map((m) => `| ${m.model} | ${m.pass} | ${m.runs} | ${pct(m.pass, m.runs)} | ${m.fallback} |`),
    '',
    '## Model × format (passes / runs)',
    '',
    `| Model | ${formats.join(' | ')} |`,
    `| --- | ${formats.map(() => '---:').join(' | ')} |`,
    ...models.map((m) => `| ${m.model} | ${formats.map((f) => cell(m.model, f)).join(' | ')} |`),
    '',
    '## Failures',
    '',
  ];
  const failing = rows.filter((r) => Object.keys(r.failures).length > 0);
  if (failing.length === 0) lines.push('None.');
  for (const r of failing) {
    const reasons = Object.entries(r.failures).map(([p, n]) => `${p} ×${n}`).join('; ');
    lines.push(`- **${r.model} / ${r.format}**: ${reasons}`);
  }
  lines.push('');
  return lines.join('\n');
}
