# Register an MCP Server Safely

Use this when you touch anything that lets a user, a manifest or a model decide **where the plugin service connects**: registering or refreshing a user MCP server, a built-in adapter that fetches a URL, a curated `MCP_REMOTE` catalog entry, the egress guard, or the invoke path. The decision and the reasons are in [ADR-179](../docs/13-adr/adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md); the contract is in [plugins-and-mcp-design](../docs/implementation/plugins-and-mcp-design.md); the code is `apps/claw-plugin-service/src/modules/{egress,mcp-servers,runtime}`.

## The five rules that do not bend

1. **One door.** Every request to a host a user or manifest named goes through `SafeEgressManager.request`. Never `fetch`, `axios`, `http.request` or the shared `httpRequest` for such a host. `assertSafeRequestUrl` is an allow-list for our own configured services; it does not resolve DNS and is not an SSRF guard for user input.
2. **Resolve here, check every answer, pin the connection.** One bad address in the DNS answer refuses the name. The socket connects to the validated address only. Do not add a second resolution "to be safe": that is the rebinding hole.
3. **No redirects for MCP.** The web reader may follow at most three hops and each hop restarts at the syntax check. Do not add a "follow redirects" flag to the MCP path.
4. **The user is told two things.** `MCP_URL_BLOCKED` (the URL itself is not acceptable) or `MCP_SERVER_UNREACHABLE` / `MCP_SERVER_REJECTED`. Never an address, a port state, a resolver message or an `EgressError.detail`. Details go to the log (host only, never the full URL: a query string can carry a secret).
5. **Everything a server says is untrusted.** Descriptions, schemas, names and results. Tools start as WRITE. Hints from the server never lower a risk. A changed tool list is `NEEDS_REVIEW` and blocks calls until the owner approves the exact hash.

## Add or change an outbound feature

1. Write the hostile cases first in `modules/egress/__tests__/ssrf-pentest.spec.ts` (URL syntax, a DNS name resolving to a bad address with a scripted resolver, a redirect, a header). The doubles are in `egress-test-doubles.ts`: `ScriptedResolver` answers per host and per call number (rebinding), `RecordingTransport` records what reached the wire.
2. Assert **before the wire**: `transport.sent` is empty for every refusal, and for syntax refusals the resolver was never asked.
3. Call `SafeEgressManager.request` with the narrowest `allowedPorts`, `allowedHosts` (a built-in adapter passes `manifest.network.hosts`), `maxResponseBytes` and `timeoutMs` you can live with. Leave `maxRedirects` unset unless a web page reader needs it.
4. Map failures at the edge: an adapter throws `AdapterError` with a message **we wrote**; an MCP call throws `McpFailure` (use `mcpFailureFromEgress`). Do not let an `EgressError` reach a response or an audit field.
5. If you add a tool result path, fence it with `fenceToolResult` and set `untrusted: true`. Add the new hostile result to the corpus in `result-and-text.utilities.spec.ts`.

## Add a built-in adapter

1. Manifest in `modules/seeding/constants/manifests` (every locale, `network.hosts` or `publicWeb`), key in `adapter-registry.constants.ts`, class `modules/runtime/adapters/<key>.adapter.ts` implementing `PluginAdapter`, registered in `AdapterRegistryManager` and `RuntimeModule`.
2. `adapter-registry.spec.ts` and `runtime-gates.managers.spec.ts` fail if a manifest key has no adapter or an adapter has no manifest.
3. No `process.env`, no database, no other service. Network only through `SafeEgressManager`. Cap your own work: a size, a nesting limit, a deadline.
4. Parsers of hostile input must be linear. `html-to-text.utility.spec` has a time check on pathological pages; copy the pattern.

## Prove it on the live network (do this once per change to the guard)

Build the service into a scratch folder and drive the real classes. The folder sits inside the workspace so `@claw/*` resolves; delete it afterwards and never commit it.

```bash
cd apps/claw-plugin-service
node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json --outDir .tmp-di
cp -r src/generated .tmp-di/generated
npx tsc-alias -p tsconfig.build.json -f --outDir .tmp-di
# write .tmp-di/live.mjs: new SafeEgressManager(new DnsHostResolver(), new PinnedHttpsTransport())
#   + McpClientManager.discover/callTool against a public MCP server, WebFetchAdapter against https://example.com/
node .tmp-di/live.mjs
rm -rf .tmp-di
```

Expect: a real page and a real public MCP server succeed; `https://localtest.me/` and `https://127.0.0.1.nip.io/` (names that resolve to loopback), `https://metadata.google.internal/` and a redirect to `http://169.254.169.254/` all fail with the same generic message. Record the observed lines in the QA evidence.

## Prove the dependency wiring

Vitest here runs without decorator metadata (Smart App Control blocks swc), so a missing provider is invisible to the specs. After adding a module, provider or constructor dependency, compile with `tsc` into the scratch folder as above and run `Test.createTestingModule({ imports: [PrismaModule, EntitlementsModule.forRoot(...), McpServersModule, RuntimeModule] }).overrideProvider(PrismaService).useValue({}).compile()`, then `get` the services and controllers. This caught nothing on the first run and is cheap; do it every time.

## Traps

- **`URL` hides things.** It silently deletes tabs and newlines and folds `0x7f.1`, `2130706433`, full-width digits and `。` into `127.0.0.1`. The guard refuses control characters first and judges the parsed host, which is also the host the connection uses. A backslash (`https://ok.example.com\@127.0.0.1/`) makes the parser's host `ok.example.com`; that is consistent, and `ssrf-pentest.spec.ts` pins it.
- **A literal NUL or invisible character in a spec** is easy to create by accident. Build such strings with `String.fromCodePoint`, never a pasted character, or ESLint's `no-irregular-whitespace` and your editor will disagree.
- **Mapped, NAT64 and 6to4 IPv6** carry an IPv4 address. A guard that only checks `::1` and `fc00::/7` lets `::ffff:169.254.169.254` through. `isPublicIpv6` judges the carried address.
- **Credentials**: sealed with AAD `userId:serverId` (servers) or `userId:installId` (installs). `CredentialCryptoManager.open` returns `null`, not an exception, for a moved or tampered row. Never log a header map; the headers object holds the key.
- **Consent has two homes.** A catalog install stores a grant in `plugin_tool_consents`; a user server stores `consent_granted` on the tool row. Both only ever hold a WRITE grant; DESTRUCTIVE is asked on every call.
- **`CONSENT_REQUIRED` is not audited and holds nothing**, so the same call id can be sent again. Do not add an audit row or a quota hold to that branch: it would turn the user's "yes" into a `409`.
- **The breaker without a half-open step stays open forever.** Keep the probe claim atomic (`claimProbe` updates `WHERE breaker_opened_at = <observed>`).
- **Dev containers bake `@claw/shared-*`.** The guard is local to the service for that reason. If you move it into `shared-utilities`, plan the container refresh in the same change.
- **nginx single-file bind mounts** (`infra/nginx/locations.conf`) need a restart, not a reload, when the route list changes. The invoke route is under the existing `/api/v1/plugins` prefix and needs no new location; a tool deadline above 60 s needs a longer `proxy_read_timeout` on that location.

## Done means

`ssrf-pentest.spec.ts` green and not weakened; `eslint --max-warnings 0` on every touched file; the live network proof recorded; the DI wiring proof recorded; the QA evidence record filled for all 15 lanes with honest `NOT_RUN`s; ADR-179 and the service guide updated if behaviour changed.
