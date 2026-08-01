# Ollama research and usage accounting design

## Outcome

ClawAI will stop allowing an Ollama cloud model to launch unbounded native web
tools during an ordinary chat request. Web research becomes an explicit,
quota-safe request routed through the existing ClawAI research service, so the
same provider selection, fallback, evidence, and citations work for cloud and
local/offline models in both the web app and VS Code extension.

The VS Code extension release is 0.12.0.

## Confirmed provider constraints

- Ollama generation responses expose prompt and output token counts and timing.
- Ollama web search and web fetch are separate provider requests and contribute
  to account limits.
- Ollama publishes qualitative per-model usage levels from low through extra
  high. Most models do not publish a stable USD token price.
- Ollama does not expose remaining session/weekly quota or reset information
  through a supported API. ClawAI must display this value as provider
  unavailable, never infer it from tokens.
- The cloud catalog is family-oriented. Connector synchronization must preserve
  exact variants returned by the authenticated tags endpoint instead of
  fabricating variants from catalog HTML.

## Request flow

Research defaults to `NONE`. The web app keeps its existing research control,
and the extension adds a `Web research` control under More settings with `Off`,
`Search`, `Search + fetch`, and `Search + extract`.

When enabled, the extension sends the existing backend `researchMode` contract.
The chat service invokes the research service once for the request. The research
service may use its configured Exa, Firecrawl, Brave, SerpAPI, Tavily, Ollama
Web, SearXNG, or generic HTTP provider and returns bounded evidence. That
evidence is inserted into model context, allowing a local model to answer with
citations without receiving direct network access.

Ollama chat request bodies no longer advertise native `web_search` or
`web_fetch` tools. This removes the open-ended 50-turn consumption path.

## Usage accounting

Usage is multidimensional and must not be collapsed into an invented token
number:

- model request count;
- input tokens;
- cached input tokens when reported;
- output/reasoning tokens;
- web-search request count;
- web-fetch/extract request count;
- provider/model;
- elapsed duration;
- qualitative model usage tier;
- nullable published input/cached/output USD rates.

Search and fetch counts travel with the research transcript persisted on the
assistant message and are rendered by both clients. Existing token ledgers
continue to count model tokens; request counts remain separately labeled.

## Model metadata

The connector service owns a curated Ollama cloud metadata registry sourced from
the official cloud model pages. It contains the 19 current cloud families and
exact known variants, context window, qualitative usage tier, and nullable
published token rates. Authenticated `/api/tags` remains authoritative for which
exact variants an account can use. Catalog HTML is discovery/fallback only.

Unknown or newly introduced models synchronize normally with usage tier
`UNKNOWN` and null prices. This prevents stale cost data from blocking access.

## Presentation

The extension shows a vibrant research status/badge only when research is
enabled or used. Token totals remain visually primary; request counters are
adjacent, distinctly labeled, and never represented as tokens. A short quota
notice explains that provider session/weekly remaining percentages are not
available through Ollama's API.

## Failure and safety behavior

- Research off means zero ClawAI-initiated search/fetch requests.
- Research failure produces a bounded warning and does not silently switch to
  Ollama native tools.
- Provider fallback attempts are counted individually by the research service.
- Results and URLs are bounded and treated as untrusted context.
- No API key, prompt, or unredacted provider response is persisted or logged.
- Existing plan entitlements and workspace-trust boundaries remain enforced.

## Verification

Regression tests prove ordinary Ollama requests contain no native web tools,
explicit research reaches the research service, request counts survive message
persistence, exact Ollama tag variants are retained, unknown variants remain
usable, and the extension defaults research to Off while sending the selected
mode. Per-workspace typecheck, lint, tests, and builds run before release, then
the exact 0.12.0 VSIX is packaged, installed, pushed, and CI is monitored.
