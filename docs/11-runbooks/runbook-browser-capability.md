# Runbook — Browser Capability (Stream 20)

The BROWSER capability provider lives at `agent-cli/src/capability-providers/browser/index.js`. It uses Playwright to drive a real Chromium instance with persistent profile.

## Operations

| Op | Target | Behavior |
|---|---|---|
| `NAVIGATE` | `{url}` | Loads URL, waits for `domcontentloaded`, returns `{title, finalUrl}` |
| `CLICK` | `{url, selector}` | Navigates then clicks a CSS selector |
| `TYPE` | `{url, selector}` + `{text}` | Fills a form field |
| `EXTRACT` | `{url, selector}` (default `body`) | Returns `textContent` of selector, capped at 100 KB |
| `SCREENSHOT` | `{url}` | Returns base64-encoded PNG |

## Required setup

```bash
npm i playwright -w agent-cli
npx playwright install chromium
```

Without these the provider throws `BROWSER provider requires the 'playwright' package` on first call.

## Profile location + encryption

Persistent context lives at `~/.claw-agent/browser-profile/`. Cookies, localStorage, and form-fill cache survive restarts. The directory is mode 0700 (owner read/write only). For at-rest encryption beyond filesystem permissions, mount the directory on an encrypted volume (FileVault / BitLocker / LUKS).

## Common operational issues

### "Browser launch fails — chromium not found"

Run `npx playwright install chromium` again. On Linux the install also needs system libs:

```bash
npx playwright install-deps chromium
```

### "Navigation times out at 30s"

The hard timeout in the provider is 30s for `domcontentloaded`. Slow sites or VPN-routed traffic can exceed it. Override per-step via `target.timeout_ms` (planned; not yet wired).

### "BROWSER step succeeded but the recipe still ran my next step on a stale state"

Browser state persists across steps (persistent context). If two parallel steps target the same browser instance they'll race. Use the recipe DSL's `parallel_group` with care for browser steps, or sequence them via `on_success`.

## Live test

```bash
node -e "
import('./agent-cli/src/capability-providers/index.js').then(async ({ providerRegistry }) => {
  const r = await providerRegistry.get('BROWSER').execute({
    operation: 'NAVIGATE', target: { url: 'https://example.com' }, payload: {},
  });
  console.log(r.output);
});
"
# Expected: { url, title: 'Example Domain', finalUrl: 'https://example.com/' }
```

## Related documents

- [Capability Framework Runbook](runbook-capability-framework.md)
- [ADR-029 — Capability framework](../13-adr/ADR-029-capability-framework-and-policy-generalisation.md)
