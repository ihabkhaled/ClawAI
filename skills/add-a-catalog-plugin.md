# Skill - add a catalog plugin

**Use when:** you add a first-party plugin to the plugin catalog, change one, or add a curated MCP entry.
**Service:** [`apps/claw-plugin-service`](../apps/claw-plugin-service/CLAUDE.md) - **ADR:** [ADR-171](../docs/13-adr/adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md)
**Design:** [plugins-and-mcp-design](../docs/implementation/plugins-and-mcp-design.md) (sections 3 and 8)

A plugin is a validated manifest, plus an adapter when it runs in-process. The catalog is admin-curated: nothing
becomes visible to users unless it is `PUBLISHED`, and an admin can hide it at any time.

## 1. Write the manifest

Create `src/modules/seeding/constants/manifests/<slug>.manifest.ts` exporting a `PluginManifestInput`, and add it
to `FIRST_PARTY_MANIFESTS` in `first-party-manifests.constants.ts`.

| Field          | Rule                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `slug`         | `[a-z0-9-]`, 3 to 40 characters, no leading or trailing hyphen, not a route word (`admin`, `installs`, `servers`, ...)    |
| `version`      | plain `major.minor.patch`, no pre-release tag                                                                             |
| `iconKey`      | a key into the frontend icon map, never a URL; add the icon there if it is new                                            |
| `translations` | `en` plus the other 12 locales (ar de es fa fr hi it ja pt ru th zh), real translations, name 80, summary 160, text 2,000 |
| `runtime`      | `BUILTIN` with an `adapterKey`, or `MCP_REMOTE` with an https public server URL                                           |
| `network`      | the exact hosts a BUILTIN adapter may call; `publicWeb: true` only for a page reader behind the SSRF guard                |
| `tools[]`      | `[a-z0-9_]` name, title, description up to 1,024, JSON-Schema input, `riskLevel`, scopes, timeout, result cap             |

Rules the schema enforces for you (and the hostile-input spec proves): no unknown keys, no `__proto__`, no remote
`$ref`, no `$id`, schema depth at most 6 subschemas and 16 KB, no control, zero-width or bidi characters in text
(the Persian ZWNJ is allowed), unique tool names, tool scopes declared, and `plugin_<slug>_<tool>` at most 64 characters.

Pick the risk level honestly. Reading public data is `READ`. Anything that changes state somewhere is `WRITE`.
Anything that deletes or cannot be undone is `DESTRUCTIVE`. Tool descriptions are shown to the model and the user:
say what the tool is for and that its result is untrusted data.

## 2. Register the adapter key (BUILTIN only)

Add the key to `BUILTIN_ADAPTER_KEYS` in `src/modules/runtime/constants/adapter-registry.constants.ts`. The
seeder skips, and logs, a BUILTIN manifest whose key is not listed, and `adapter-registry.spec.ts` fails when a
key is registered that no manifest uses. The adapter itself implements `PluginAdapter` and lands with the invoke
path: no `process.env`, no other service's database, network only through the shared egress client limited to
`manifest.network`.

## 3. Let the seeder do the rest

Do not write SQL and do not add a migration: the seeder upserts the entry, the version and the tool rows on boot.

- A new slug is created `PUBLISHED`.
- A changed manifest with the same version is rewritten in place (the hash differs); a higher version is added and
  becomes current; a lower one is stored without moving the pointer.
- `status`, `globallyEnabled`, `featured` and a tool's `disabledByAdmin` are never written after creation. If an admin
  hid your plugin, a redeploy does not bring it back.

## 4. Tests that must stay green

```bash
cd apps/claw-plugin-service
npm run typecheck
npm run lint
npm test
```

`first-party-manifests.constants.spec.ts` checks, for every manifest: schema-valid, all 13 locales present and
distinct from English, adapter registered, native tool names within 64, network as declared. Add your slug to the
expected list there. If you added a locale-sensitive string, read it in the language, not just in the test.

## 5. Ship the knowledge with it

- The catalog card text is the user-facing copy: no extra i18n file is needed for it (it lives in the manifest).
- Update [`docs/04-backend/service-guide-plugin.md`](../docs/04-backend/service-guide-plugin.md) if the plugin adds a
  host, a setting or a new kind of adapter.
- Check `GET /api/v1/plugins/catalog` and `/catalog/<slug>` with `curl` as a Free-plan user, and the `/plugins`
  page in a browser, then record the lanes in `docs/qa-evidence/`.

## Pitfalls

- A manifest edited without a version bump rewrites that version for everyone who has it. Bump the version when the
  tools or their schemas change in a way a user would notice.
- `network.hosts` is the only way a BUILTIN adapter reaches the internet. Do not widen it to make a test pass.
- Never list a vendor MCP server without the owner naming the vendor and accepting the legal note (design decision 4).
- Translation fields reject newlines in names and summaries. Keep descriptions plain text.
