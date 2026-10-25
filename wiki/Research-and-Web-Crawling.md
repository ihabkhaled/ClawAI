# Research and Web Crawling

The research service owns dynamic web evidence acquisition and research orchestration.

## Modules

- `fetch`
- `health`
- `research`
- `scrape`
- `search`

The repository has explicit rules for truthful web evidence and bounded/narrated agentic research.

GitHub repository requests are scoped to `github.com/<owner>/<repo>` throughout
candidate discovery and link following. The crawler fetches selected pages through
`FetchService`; it does not clone the repository or promise a complete file
inspection. Answers must cite the paths present in fetched evidence and state the
coverage limits. For large crawls, per-page progress is streamed live, while the
saved chat narration keeps milestones and the final count instead of every page
tick.

Sources: [rules/41-web-evidence-truthfulness.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/41-web-evidence-truthfulness.md) · [rules/50-agentic-research-loop-and-narration.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/50-agentic-research-loop-and-narration.md) · [[Service page|Service-claw-research-service]].
