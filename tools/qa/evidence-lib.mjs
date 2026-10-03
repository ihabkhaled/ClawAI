// QA evidence protocol (rules/60). Pure functions: parse an evidence record, validate it,
// and decide which commits in a range owe one. No I/O here so the node:test suite can drive it.

export const LANES = [
  ['L01', 'Unit and integration tests (only the changed files)'],
  ['L02', 'Typecheck, lint and build (touched workspaces)'],
  ['L03', 'Manual API test (curl) with the log line proving the branch ran'],
  ['L04', 'Manual browser test (Playwright against the real UI) with screenshots'],
  ['L05', 'Automation e2e (a committed or existing spec was run)'],
  ['L06', 'RBAC across roles and plan tiers (admin, paid, FREE)'],
  ['L07', 'Device matrix (3+ widths, both orientations, RTL)'],
  ['L08', 'UAT (acceptance criteria walked as the user would)'],
  ['L09', 'Product verification (it does what the owner asked, edge cases decided)'],
  ['L10', 'Business verification (money, limits, copy and claims match the code)'],
  ['L11', 'Regression (neighbouring features still work)'],
  ['L12', 'Security (authz and IDOR, secrets, injection)'],
  ['L13', 'Performance and accessibility'],
  ['L14', 'i18n (13 locales, RTL)'],
  ['L15', 'Docs, knowledge delta and GitHub gates read'],
];

export const STATUSES = ['PASS', 'FAIL', 'NOT_RUN', 'NOT_APPLICABLE'];
export const VERDICTS = ['DONE', 'PARTIAL'];
export const MIN_EVIDENCE_CHARS = 20;
export const MIN_REASON_CHARS = 10;

const UNFILLED = 'write the reason, or replace with PASS and the real evidence';
const PLACEHOLDERS = /\b(todo|tbd|assumed|n\/a|none|same as above|looks fine|should work)\b/i;

export function parseRecord(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\|\s*(L\d{2})\s*\|([^|]*)\|\s*([A-Z_]+)\s*\|(.*)\|\s*$/.exec(line);
    if (m) {
      rows.push({ id: m[1], lane: m[2].trim(), status: m[3].trim(), detail: m[4].trim() });
    }
  }
  const verdict = /^Verdict:\s*([A-Z]+)/m.exec(text)?.[1] ?? null;
  const batch = /^Batch:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? null;
  return { rows, verdict, batch };
}

export function validateRecord(text) {
  const problems = [];
  const { rows, verdict, batch } = parseRecord(text);
  if (batch === null || batch.length < 5) problems.push('missing "Batch:" line');
  if (verdict === null || !VERDICTS.includes(verdict)) {
    problems.push(`"Verdict:" must be one of ${VERDICTS.join(', ')}`);
  }
  for (const [id] of LANES) {
    const found = rows.filter((r) => r.id === id);
    if (found.length !== 1) {
      problems.push(`${id}: expected exactly one row, found ${String(found.length)}`);
      continue;
    }
    const row = found[0];
    if (row.detail.includes(UNFILLED)) {
      problems.push(`${id}: still the unfilled template line`);
    } else if (!STATUSES.includes(row.status)) {
      problems.push(`${id}: status "${row.status}" is not one of ${STATUSES.join(', ')}`);
    } else if (row.status === 'PASS') {
      if (row.detail.length < MIN_EVIDENCE_CHARS) {
        problems.push(
          `${id}: PASS needs evidence (the command and its real output, a path, a count)`,
        );
      } else if (PLACEHOLDERS.test(row.detail)) {
        problems.push(`${id}: PASS evidence reads as a placeholder or an assumption`);
      }
    } else if (row.status === 'NOT_RUN' || row.status === 'NOT_APPLICABLE') {
      if (row.detail.length < MIN_REASON_CHARS) {
        problems.push(`${id}: ${row.status} needs a reason`);
      }
    }
  }
  const openLanes = rows.filter((r) => r.status === 'NOT_RUN' || r.status === 'FAIL');
  if (verdict === 'DONE' && openLanes.length > 0) {
    problems.push(
      `Verdict DONE but ${openLanes.map((r) => `${r.id} ${r.status}`).join(', ')} is open: say PARTIAL`,
    );
  }
  return problems;
}

export function renderTemplate(batch) {
  const rows = LANES.map(([id, name]) => `| ${id} | ${name} | NOT_RUN | ${UNFILLED} |`).join('\n');
  return `# QA evidence - ${batch}

Batch: ${batch}
Date: ${new Date().toISOString().slice(0, 10)}
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What | Status | Evidence or reason |
| --- | --- | --- | --- |
${rows}

## Findings

(bugs found while testing, what was fixed, what is still open and why)

## Open gaps

(every NOT_RUN or FAIL lane again, with who closes it and when)
`;
}

// Which commits owe an evidence record: a feat/fix/perf commit that touches product source.
const OWING_TYPE = /^(feat|fix|perf)(\([^)]*\))?!?:/;
const PRODUCT_SOURCE = /^(apps|packages)\/[^/]+\/(src|prisma)\//;

export function commitOwesEvidence(subject, files) {
  return OWING_TYPE.test(subject) && files.some((f) => PRODUCT_SOURCE.test(f));
}

export function evidenceFilesIn(files) {
  return files.filter((f) => /^docs\/qa-evidence\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(f));
}
