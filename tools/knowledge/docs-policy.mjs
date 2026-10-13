// Which markdown the docs checks (rules/63) judge, and how.
//
// LIVING docs describe the repository as it is now and must stay accurate:
// every reference resolves, no hand-written counts, no copied sections.
//
// HISTORICAL docs are dated records of what was true when they were written —
// QA evidence, ADRs, change notes, plans, agent memory. They are exempt from the
// accuracy checks (rewriting history to match today would destroy the record),
// but nothing outside them may link INTO a stale path either.
//
// GENERATED docs are written by tools/knowledge/build.mjs and verified for
// freshness instead; their source is what gets checked.

export const HISTORICAL_DOCS = [
  /^docs\/qa-evidence\//u,
  /^docs\/13-adr\//u,
  /^docs\/adrs\//u,
  /^docs\/changes\//u,
  /^docs\/superpowers\//u,
  /^docs\/implementation\//u,
  /^docs\/16-quality-engineering\/coding-agent-lab\//u,
  /^docs\/16-quality-engineering\/evidence\//u,
  // Implementation streams, progress logs, audits and QA outputs record a
  // moment in a build-out; the shipped state is described elsewhere.
  /^docs\/15-ai-context\/routing-flagship-streams\//u,
  /-implementation-progress\.md$/u,
  /-audit-and-gap-matrix\.md$/u,
  /__QA_output\.md$/u,
  // A date in the file name marks a dated record.
  /(^|\/)[^/]*\d{4}-\d{2}-\d{2}[^/]*\.md$/u,
  /^memory\//u,
  /^work\//u,
  /(^|\/)CHANGELOG\.md$/u,
];

/** First line a generated markdown file carries. */
export const GENERATED_MARKER = /^<!-- GENERATED\b/u;

export function isHistorical(rel) {
  return HISTORICAL_DOCS.some((pattern) => pattern.test(rel));
}

/** A fenced block preceded by this marker is an intentional example: not checked. */
export const EXAMPLE_MARKER = '<!-- docs:example -->';
