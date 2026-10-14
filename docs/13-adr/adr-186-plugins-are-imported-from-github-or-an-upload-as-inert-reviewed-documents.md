# ADR-186: Plugins are imported from GitHub or an upload as inert, reviewed documents

**Status:** Accepted

**Date:** 2026-10-15

Builds on [ADR-171](adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md) and [ADR-179](adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md). Service guide: [service-guide-plugin](../04-backend/service-guide-plugin.md). Supported formats: [plugin-import-supported-formats](../02-business-product/plugin-import-supported-formats.md).

## Context

The web app read no Claude Code or Codex plugin format and had no way to bring a plugin in. The VS Code extension reads `clawai-plugin.json` and `clawai-marketplace.json`; Claude Code plugins use `.claude-plugin/plugin.json` and `marketplace.json` with `skills/`, `commands/`, `agents/`, `hooks/` and `.mcp.json`. Users own such plugins (a "be brief" skill pack, a game, a diagnosis pack) and want them in ClawAI.

A plugin is a stranger's folder. Reading one is an input-handling problem, not a feature: a repository URL is an SSRF vector, an archive is a zip-slip and zip-bomb vector, a manifest is a prototype-pollution and path-traversal vector, and the content includes commands and hooks written to be executed on a developer's computer.

## Decision

**Import is read, review, confirm. Nothing imported is ever executed by the server.**

- **Two sources.** A GitHub address (`owner/repo`, `owner/repo/folder`, `owner/repo@ref`, a github.com or raw.githubusercontent.com link, or a marketplace file), and an uploaded `.zip` / `.tgz`. No git, no clone, no shell.
- **GitHub is read through `SafeEgressManager`** (ADR-179) with an allow-list of exactly two hosts (`api.github.com`, `raw.githubusercontent.com`), no redirects, per-request and overall time caps, a request cap, a file-count cap and a byte cap. The ref is resolved to a **commit SHA first** (`Accept: application/vnd.github.sha`), the tree is read at that SHA, and every file is downloaded by SHA, so what the user reviews is what is stored and the commit is recorded. Symlinks (mode 120000) and submodules are skipped.
- **Archives are parsed in memory by our own readers** (`node:zlib` only, no new dependency, nothing extracted to disk). The reader picks the format by magic bytes, never by name. Refused: absolute paths, drive letters, backslashes, `..` and `.` segments, control and bidi-override characters, over-deep or over-long paths, symlinks, hard links and device entries, duplicate names (compared case-insensitively), non-UTF-8 names and kept files, encrypted entries, zip64, too many entries, an entry or total above the unpacked caps, a compression ratio above 100 (per entry and overall), an entry that inflates beyond its declared size (inflate is capped at the declared size), overlapping data ranges, and checksum mismatches. Only entries that can matter are inflated at all.
- **Manifests are hostile JSON.** Size cap, strict UTF-8, nesting cap measured before parsing, a node-count cap, and a refusal (not a strip) of `__proto__`, `constructor` and `prototype` keys anywhere. Every component path a manifest declares must be a safe relative path or the whole import is refused. Names are NFC-normalised, stripped of control and bidi characters, collapsed and cut by code points; two components with the same name keep the first and warn. Front matter is read as flat `key: value` lines, not YAML.
- **The parser understands three layouts**: Claude Code (`.claude-plugin/plugin.json`), ClawAI (`clawai-plugin.json`) and a bare folder of component directories; a marketplace file answers with its candidates instead of a plugin.
- **Support is stated per component, honestly.** Remote https MCP servers: usable now (the user adds them through the existing My servers flow, where the SSRF guard and consent apply). Skills, commands, agents and output styles: stored as inert documents; there is no skills library, so chats cannot use them yet and the UI says so. Hooks and stdio MCP servers: never run, shown as not supported on the web, risk HIGH. `.mcp.json` and `hooks.json` are read for the preview and **not stored** (they can hold secrets and commands).
- **Review, then confirm.** `POST /plugins/imports/preview/*` stores a 30-minute draft (at most 5 per user) and returns the preview with a SHA-256 checksum over every kept file and the component list. `POST /plugins/imports/:draftId/confirm` needs that checksum and `acknowledged: true`, re-hashes the stored draft, and installs in one transaction with the quota re-check and the audit row. A changed or expired draft answers with a stable code.
- **Per-user storage with quotas**: 20 imported plugins and 20 MB of stored text per user, a unique plugin name per user, owner-scoped reads and deletes, an audit row for every import and removal (no file contents), and deletion with the account.
- **Errors are stable codes** (`PLUGIN_IMPORT_*`); the UI translates them. Reasons that would help an attacker map the network are not returned (egress failures read as one code).

## Consequences

- A plugin that depends on hooks or local programs imports but does not work on the web. That is stated at review time, not discovered later.
- Skills are stored but unused until a skills library exists. Wiring them into chat is a separate decision.
- GitHub's unauthenticated API allows 60 requests an hour per source IP; an import costs two. A busy deployment may need a token; that would be a DB-level setting, not an env var.
- Private repositories are not supported (no user token is accepted).
- Custom component paths in a manifest outside the default folders (`skills/`, `commands/`, `agents/`, `output-styles/`, `hooks/`) are validated but their files are not read.
- The archive readers are our code. Their protections are covered by specs with hand-built hostile archives; any new archive format needs the same list.
