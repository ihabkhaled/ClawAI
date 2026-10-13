# Plugins: installs, Installed page and admin console

> Frontend side of plugin batch 2. The service side is
> [`service-guide-plugin.md`](../04-backend/service-guide-plugin.md) and
> [ADR-172](../13-adr/adr-172-plugin-installs-consent-and-credentials.md); the design is
> [`plugins-and-mcp-design.md`](../implementation/plugins-and-mcp-design.md). Nothing here
> invokes a tool, registers an MCP server or touches chat. Those are batches 3 and 4.

## Routes

| Route                | Component                | Gate                                      |
| -------------------- | ------------------------ | ----------------------------------------- |
| `/plugins`           | `PluginsPage` (Discover) | `PLUGINS_USE` and the `allowPlugins` gate |
| `/plugins/installed` | `InstalledPluginsPage`   | same as `/plugins` (prefix match)         |
| `/plugins/[slug]`    | `PluginDetailPage`       | same                                      |
| `/admin/plugins`     | `AdminPluginsPage`       | `PLUGINS_ADMIN`                           |

Discover and Installed are two routes joined by `PluginsNav` (two links, `aria-current` on
the active one), not client tabs, so each view has its own URL and Back works. A plugin whose
slug is `installed` would be shadowed by the static route; slugs are admin-curated.

## Where things live

All paths are under `apps/claw-frontend/src/`.

- Contract types come straight from `@claw/shared-types` (`plugin-installs.type.ts`). Frontend
  view and props types are in `types/plugin-installs.types.ts`.
- Repositories: `repositories/plugins/plugin-installs.repository.ts` and
  `plugin-admin.repository.ts`. The install service `services/plugins/plugin-install.service.ts`
  does the two-call "install, then store the key".
- Hooks: `hooks/plugins/`. One controller hook per component; `use-plugin-invalidation.ts` is
  the single list of caches a change makes stale (installs, mentions, catalog, detail).
- Pure logic: `utilities/plugin-installs.utility.ts` (install gate, error-code mapping, consent
  level, admin setting diff) and `utilities/plugin-settings-form.utility.ts` (settings form from
  the manifest `settingsSchema`).
- Components: `components/plugins/` (install button and dialog, Installed page, settings
  sheet, consent list) and `components/admin/plugins/`.
- Text: `pluginsInstall.*` in `lib/i18n/locales/plugins-install-translations.ts` and `pluginsStatus.*`
  (catalog status labels, plan and entitlements errors, key-not-saved, already-installed, minimum
  length) in `plugins-status-translations.ts`, all 13 locales.

## Behaviour worth knowing

- **Install gate.** `resolveInstallGate` explains why Install is off, in this order: the install
  is `UNAVAILABLE` (admin switched the plugin off), already installed, the plan has
  `allowPlugins` off, the plan cap is reached. The cap comes from entitlements
  `plan.limits.maxInstalledPlugins`: `null` is unlimited, `0` is disabled, absent means the plan
  did not say and the server decides. The server enforces all of it again
  (`PLUGIN_INSTALL_LIMIT`, `PLUGIN_UNAVAILABLE`).
- **Review before install.** The install dialog reuses `PluginToolList` and `PluginPermissions`,
  so the person sees every tool with its risk, the scopes, the hosts (or the open web) before
  confirming.
- **Keys are write-only.** The key field is a password input kept in hook state only: cleared on
  close and on success, never put in a query key, a toast or a log. A saved key shows as
  "saved"; the server never sends it back.
- **Settings form.** Drawn from the manifest subset: string, number, integer, boolean and string
  enums. Anything else is skipped. An invalid draft sends nothing. A whole-number field opens the
  digits keyboard (`inputMode="numeric"`); a text field honours the schema `minLength` and
  `maxLength` (never above the form cap of 500).
- **Key fails after the install worked.** `installPluginWithCredential` throws
  `PluginCredentialSaveError` carrying the new install. The dialog stays open with the
  `pluginsStatus.errors.credentialFailed` message and the next confirm retries only the key call
  against that install, so a second install is never attempted. Closing the dialog leaves the
  install in place and the key can be added from Installed settings.
- **Errors** map by the response `errorCode` (an own-property lookup, so an inherited name such as
  `toString` is never a code), then by status (409, 404), else a generic message. The plan codes
  `PLUGIN_PLAN_DISABLED` and `PLUGIN_ENTITLEMENTS_UNAVAILABLE` have their own messages. The backend
  message is never shown.
- **Install button.** `aria-describedby` is set only while the reason sentence is on the page. An
  install the list has not caught up with gets its own "already installed" sentence; an install
  that exists shows the state badge and Manage link instead.
- **Revoke consent.** `DELETE /plugins/installs/:id/consent/:toolName` answers 204 with no body.
- **Catalog status.** The admin row translates `DRAFT`, `PUBLISHED`, `DEPRECATED` and `HIDDEN`; an
  unknown status is shown as the server sent it.
- **Plan form.** `maxInstalledPlugins`, `maxUserMcpServers` and `maxPluginCallsPerDay` use
  `PlanNullableLimitField`: an "Unlimited" checkbox (blank) next to a number, where `0` means
  disabled. Unchecking Unlimited writes `0`, never a blank. The plan list prints the three caps
  with unlimited and disabled worded differently.
- **Admin settings.** The rows are whatever the service returns; a boolean is a switch, a number
  is a whole-number input. `PLUGIN_SETTING_BOUNDS` in `constants/plugin-installs.constants.ts` holds
  the same range as the service for every integer key; `plugin-setting-bounds.constants.test.ts`
  reads the service's `admin-settings.constants.ts` and fails when the two differ. The service
  still checks every value again.

## Open gaps against the service

Revoke consent calls `DELETE /plugins/installs/:id/consent/:toolName` (204), a route the service
owns.

- **Global disable of a plugin the user has not installed.** The catalog detail has no
  `globallyEnabled` flag, so the disabled-with-a-reason state shows for an installed plugin that
  is `UNAVAILABLE`. For anything else the server answers `PLUGIN_UNAVAILABLE` on install and the
  dialog shows that message.

## Tests

Under `__tests__/` next to each unit: hooks (`plugin-installs-hooks`, `plugin-admin-hooks`),
components, the repositories, the utilities, the plan form and a locale parity test
(`lib/i18n/__tests__/plugins-install-translations.test.ts`).
