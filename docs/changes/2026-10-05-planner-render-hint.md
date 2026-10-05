# Change - planner render hint (batch 2 of 3)

## Before

Escalation order was fixed (plain HTTP first). A page the model could tell is a JS app or sits
behind bot protection still paid for plain and TLS attempts first, and nothing the model judged
reached the fetch layer.

## Change

The planner may set `render: js | stealth`; it flows to research-service as a tier-ordering hint
(`orderChainForHint`). No tier is added, no sidecar enabled, no gate relaxed.

## Knowledge delta

ADR-121 addendum 3, rule 50 item 10, both service `CLAUDE.md` files, generated `.ai/**`.

## Not in this change

Hint for search-found and discovered crawl pages (host memory carries the homepage winner on);
the context-gateway crawl has no planner and sends no hint.
