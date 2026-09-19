> **Wiki source:** [`ihabkhaled/ClawAI-Coding-Agent/docs/TESTING.md`](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/TESTING.md) on the current `main` branch.

# Testing strategy

## Lanes

- Unit tests cover pure URL, redaction, session, context, SSE, model, edit, and
  workflow behavior, plus runtime schemas, host mapping, negotiation, ordered
  reduction, replay, epoch, terminal-state, and forward-compatibility rules.
- Integration tests exercise the real `BackendClient` against mocked Fetch
  responses, including refresh, every endpoint, invalid contracts, redaction,
  logout cleanup, and network errors.
- Package audit statically verifies command registration, Marketplace assets,
  Workspace Trust mode, absence of secret settings, webview CSP/nonce/DOM
  invariants, locale matrices, and VSIX exclusions.
- Extension-host tests download the declared VS Code engine, activate the
  packaged bundle in a fixture workspace, assert all commands exist, and enforce
  an activation budget.
- Playwright serves the production webview markup, CSS, and JavaScript with a
  deterministic VS Code bridge. It covers responsive editor/sidebar layouts,
  local/manual model persistence, agent and permission modes, workspace
  fallback, streaming/completion/error states, theme tokens, browser errors,
  multi-tab history, token reconciliation, explicit diff review, and Windows
  screenshot baselines. The disconnected lane verifies that only the focused
  backend connection gateway is available, including its default URL,
  authorization progress, inline errors, and connected-state transition.

Runtime security-critical pure modules require at least 95% statements,
branches, functions, and lines. Release verification also inspects the VSIX to
prove 0.18 introduces no executable or native binary.

`npm test` enforces at least 85% lines, statements, functions, and 80% branches
over the pure backend/security/application modules. VS Code adapters are
validated in the extension host rather than mocked into misleading unit
coverage.

## Commands

```bash
npm run test:unit
npm run test:integration
npm test
npm run package:audit
npm run test:host
npx playwright install chromium
npm run test:playwright
npm run check
```

## Manual testing

Use the checklist in [UAT.md](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/UAT.md) against both a loopback backend and an
HTTPS deployment. Never use production credentials in recordings or issue
attachments.
