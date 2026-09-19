# Skill — Verify the AUTO research loop live

**Use when**: you changed the planner, the crawl, narration, or anything on the
path from a chat message to web evidence.

**Governing rules**: [rules/50](../rules/50-agentic-research-loop-and-narration.md) ·
[rules/41](../rules/41-web-evidence-truthfulness.md) · [rules/49](../rules/49-qa-team-discipline-and-test-evidence.md)

---

## 1. Rebuild, don't restart, after a shared-package change

The dev images carry a BAKED `packages/` copy. A change to `@claw/shared-utilities`
or `@claw/shared-entitlements` is invisible until the image is rebuilt:

```bash
./scripts/claw.sh service:rebuild research-service
./scripts/claw.sh service:rebuild chat-service
docker exec claw-chat-service-1 ls /app/packages/shared-utilities/dist/url-detection   # must list files
```

## 2. The API lane — watch the stream, not just the status

```bash
TOK=...admin token...; TH=...new thread...
curl -skN -m 45 "https://claw.local/api/v1/chat-messages/stream/$TH" -H "Authorization: Bearer $TOK" > /tmp/sse.out &
curl -sk -X POST https://claw.local/api/v1/chat-messages -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' \
  -d "{\"threadId\":\"$TH\",\"content\":\"read example.com and summarise it\",\"researchMode\":\"AUTO\"}"
```

Expect: POST 201 in milliseconds; `narration:planned`, `crawl_started`,
`crawl_progress` (each ONCE, not once per replica), `crawl_done`, then
`ai_thinking`; and the answer's `metadata.narration` holding the same lines.

## 3. The browser lane — defeat the service worker FIRST

Dev chunk URLs are not content-hashed and the PWA service worker re-registers
itself, so the page silently runs yesterday's JavaScript. This cost an hour on
2026-09-19: the server served fresh code while the browser rendered none of it.

```js
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await page.evaluate(async () => {
  for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  for (const k of await caches.keys()) await caches.delete(k);
});
```

Prove the code is current before trusting any result: fetch the chunk with
`cache: 'no-store'` and look for a string you just added.

Then send a message and sample `[data-testid="narration-log"]` every ~300 ms:
`LIVE:n` rising while the turn runs, then `stored:n` on the answer. Reload the
page: the stored log must still be there, collapsed, above a separate answer.

## 4. The plan gate

As a user whose plan lacks research, a message with a URL must produce no
research at all (`research=NONE` in the chat log) — not a 403.
