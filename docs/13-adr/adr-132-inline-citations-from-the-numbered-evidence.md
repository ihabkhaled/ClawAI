# ADR-132 — Inline citations link only through the evidence the model was shown

## Status

Accepted — 2026-09-30. Chat-supremacy Batch 5 (pack batch M). Audit:
[chat capability audit](../14-risk-debt/chat-capability-audit-2026-09.md).
Governing rule: [rule 41](../../rules/41-web-evidence-truthfulness.md) §16.

## Context

The research block tells the model to "cite sources as [n]" and prints
`[index + 1] title — url` for each item of `context.researchEvidence`. The
frontend had no citation parser, so `[3]` reached the reader as plain text,
with the sources only in a separate "Used N sources" panel. Every competitor
links citations inline ([benchmark](../02-business-product/chat-competitive-benchmark-2026-09.md)).

The obvious fix — link `[n]` to `metadata.researchTranscript.sources[n-1]` — is
wrong: the transcript is rebuilt from the research bundle separately and is not
guaranteed to be the list, in the order, the model was shown. A citation that
opens the wrong page is a fabricated citation, which the pack forbids and which
is worse than plain text.

## Decision

1. **The answer stores what the model saw.** `runLlmAndStore` writes
   `metadata.citations = toStoredCitations(context.researchEvidence)` —
   `{ index, title, url, snippet }` with `index` = the printed `[n]`, from the
   same `context` the prompt was built from. Evidence IS fitted to the window,
   but inside `assemble` (`fitResearchEvidence`) BEFORE the list lands in
   `context.researchEvidence`; nothing after that reorders or trims it. Keep
   any future fitting before that point. When SEARCH_FIRST applied, the prompt
   also carries its own `[1]..[k]` search list, so NO citations are stored for
   that answer. Bounded: 50 entries, title 300, snippet 280. A non-http entry is still stored so later numbers do not shift.
2. **`[n]` becomes a link only through that list.** A remark plugin
   (`remarkCitations`) rewrites text-node `[n]` for `1 ≤ n ≤ max stored index`
   into a `#cite-n` link — never inside code, an existing link, or raw HTML —
   and the markdown `Anchor` renders it as `CitationLink` from a
   `CitationsContext`. A number with no stored entry stays plain text.
3. **Only http(s) opens.** `safeCitationUrl` gates the href; any other scheme
   renders a labelled, non-clickable chip. Links open in a new tab with
   `noopener noreferrer`. The whole path runs after `rehype-sanitize`
   (the fragment href survives it; a test proves it end to end).
4. **Zero cost when unused.** With no citations the plugin list and render are
   exactly as before; `MarkdownRenderer`'s memo compares citations by index and url so
   a bubble rebuilding its array does not re-parse the answer.

## Rejected alternatives

- **Link through `researchTranscript.sources`.** Not the list the model saw
  (see Context).
- **A regex over the raw markdown string.** Would rewrite `arr[1]` inside code
  and footnote-like text; the AST plugin only touches text nodes.
- **Hover cards with fetched previews.** A network fetch per hover from the
  browser is a privacy and SSRF-adjacent surface; the stored title/host/snippet
  cover the need.

## Consequences

- `buildPromptString`'s last-resort head/tail cut (`truncateToTokenBudget`)
  can drop late evidence lines while they stay stored; a model citing a number
  it no longer saw would be linked to that source. Rare (the budget is fitted
  earlier) and accepted; recorded here.
- Answers written before this change have no `metadata.citations`; their `[n]`
  stays plain text (no backfill: the evidence order was never recorded).
- Lab and compare lanes still build their own prompts and do not store
  citations yet — their `[n]` stays plain text.
- File-page provenance and a "grounded vs model knowledge" marker are not in
  this batch (audit row M).
- Tests: chat-service `stored-citations.utility.spec.ts`,
  `chat-messages.service.spec.ts` (stores the numbered sources; stores none after
  SEARCH_FIRST), `context-assembly-citation-numbering.spec.ts` (printed `[n]` ==
  stored index); frontend `markdown-citations.test.tsx` (link, out-of-range,
  unsafe scheme, code, no-citations, helpers).

## What would make this stale

A change to `formatResearchBlock`'s numbering (e.g. sorting evidence after the
block is printed, or numbering from 0) without the same change in
`toStoredCitations` — the stored index and the model's `[n]` would diverge.
