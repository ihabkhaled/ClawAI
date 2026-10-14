# Runbook: Plugin catalog administration

When to use it: you add or fix a curated MCP server, a user's own server is waiting for a decision (or the queue is stuck), a server must be blocked, or you need to know who changed what. Decision: [ADR-187](../13-adr/adr-187-admin-curates-the-catalog-and-decides-user-servers-from-the-database.md). Contract: [service-guide-plugin](../04-backend/service-guide-plugin.md#admin-curation-adr-187). Screen: `/admin/plugins/curation` (needs `PLUGINS_ADMIN`; the ADMIN role has it).

## Add a curated server

1. Open **Catalog curation**, tab **Curated entries**, **New entry**.
2. Fill slug, publisher, category, icon, the server URL (a public `https` address) and the transport. Pick the key type. For an API key or bearer entry, paste a key into **Key for the preview only**; it is sent once and never stored. Users add their own key when they install.
3. Press **Preview tools**. The service calls the server (the MCP `initialize` and tool-list calls) and lists what it offers. A tool whose name is not lower case, digits and underscore is shown as unusable and cannot be selected (a curated tool is called by its manifest name).
4. Tick the tools users may use and set each risk. Every tool defaults to **write**; lower one to **read** only when it cannot change anything. Add English text (required) and any other languages (an empty language falls back to English).
5. Optionally list the plan slugs that may install it (empty means every plan) and add notes.
6. **Save draft** keeps it hidden. **Publish** re-probes the server and refuses a tool it does not list. Publishing makes the entry visible; switch it on with the toggle if it is off.

If the preview fails with "could not be reached", the address is wrong, not public, or the server needs a key you did not paste. The reason is in the plugin-service log (`runProbe:`), never in the answer.

## Seeded drafts

On first boot the service seeds 13 curated entries as disabled drafts marked **URL needs checking**. They carry one placeholder tool. Two use the URL written in the integration catalog (marked "verify" there); the rest use `https://verify-url.example.com/mcp`, which is not a server. For each: replace the URL with the vendor's documented one, **Preview tools**, tick tools, **Publish**. The service will not switch a draft or an unverified entry on. A seeded entry is never rewritten on later boots, so edits and deletes stay.

## Switch off or remove

- The toggle on a row is the kill switch: the entry leaves the catalog and its installs read **unavailable**. It is reversible.
- **Delete** is a soft delete: hidden for everyone, installs stop working, the row is kept and the slug stays taken. There is no undelete in the screen; set `deleted_at = NULL`, `status = 'PUBLISHED'`, `globally_enabled = true` in `claw_plugin.plugin_catalog_entries` if it was a mistake, and write down why.
- To stop one tool, use the existing **Plugins admin** page (per-tool switch).

## Health

**Check health** pings the server without a key and stores `Healthy`, `Down` or `Not checked`, the latency in ms and a code. A keyed server that refuses the unkeyed ping shows `AUTH_REQUIRED` and stays "not checked": that is expected. `HOST_DENIED` means a rule now blocks the host. Health is on demand; nothing checks on a schedule yet.

## Approve or reject a user's server

1. Turn on `userServers.requireApproval` in **Plugins admin → Settings** only after you can work this queue. It is off by default.
2. Tab **Approval queue** lists servers waiting for a decision: who sent it (user id), the host and path, the tools with their risk, the highest risk and whether it has a key. Every user tool starts as **write**.
3. **Approve** lets the user's chats call it (they still consent per tool). **Reject** needs a short reason; the person is shown it in the bell, by email and by push if they enabled it.
4. A server the user changed after approval shows up under **Held for review** (its tool list changed); reject it, or leave it for the user to approve the changes.
5. A server you decide twice, or that the user deleted, answers "already decided" and nothing changes.

If a user says they never heard back: look in the audit log for `SERVER_APPROVED` or `SERVER_REJECTED`, then in auth-service for the notification (`user.notification_requested`, dedupe key `mcp-server-approved:<serverId>:<time>`). The decision stands even when the notice failed.

## Rules

Tab **Rules**. A **deny** rule always wins. Once an **allow** rule exists for a type (host, publisher or slug), that type accepts only what its allow rules cover. A host rule covers the host and its subdomains. Rules apply when a user registers a server, when you approve one, and when you preview, save or health-check a curated entry. A rule added later does not block calls to a server that is already approved: reject or disable that server too. Check the effect by trying to register a server on the host (`403 PLUGIN_CURATION_HOST_DENIED`).

## Audit log

Tab **Audit log** (or `GET /api/v1/plugins/admin/audit?limit=100&targetType=MCP_SERVER`). Actions: `CATALOG_CREATED`, `CATALOG_UPDATED`, `CATALOG_ENABLED`, `CATALOG_DISABLED`, `CATALOG_DELETED`, `CATALOG_HEALTH_CHECKED`, `CATALOG_SEEDED` (actor `system`), `SERVER_APPROVED`, `SERVER_REJECTED`, `RULE_ADDED`, `RULE_REMOVED`. Summaries hold names, counts and codes only; a key, a URL query string or a tool argument is never in a row. Changes made on the older **Plugins admin** page (kill switch, featured, per-tool disable, settings) are logged in the service log, not here.

## Deploying this change

Migration `20261015120000_plugins_admin_catalog` is additive (three enums, columns on two tables, two tables). Order: run the migration, deploy plugin-service, then auth-service and frontend (they carry the two notification kinds; an older auth-service drops an event of an unknown kind, so deploy it before turning `requireApproval` on). `@claw/shared-types` changed: rebuild the shared packages. The seeder runs at boot and soft-fails (look for `curated catalog seeded` in the log).
