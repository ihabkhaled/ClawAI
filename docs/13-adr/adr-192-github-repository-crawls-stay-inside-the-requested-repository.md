# ADR-192: GitHub repository crawls stay inside the requested repository

**Status:** Accepted
**Date:** 2026-10-25

## Context

A site crawl started from a repository URL could follow GitHub's global sitemap
and links to unrelated repositories or marketing pages. The result could be
mistaken for a review of the requested repository.

## Decision

- When the requested URL names `github.com/<owner>/<repo>`, only candidate and
  followed links under that repository path are eligible for the crawl.
- Keep the existing page and depth bounds. The crawl reads selected pages; it is
  not a Git clone or an exhaustive file scan.
- Include a prompt note when GitHub repository evidence is present. The answer
  must name only cited paths and must not claim that every file was inspected.
- Keep every network request on the existing `FetchService` path and its
  existing SSRF and domain-policy checks.

## Consequences

Repository requests no longer collect neighboring repos or unrelated GitHub
pages. The bounded coverage is explicit to the answer model. Existing page
limits remain unchanged.

**Stale when:** GitHub URL routing, crawl scope, or the repository evidence
contract changes.

**Stale when:** GitHub URL routing, crawl scope, or the repository evidence
contract changes.
