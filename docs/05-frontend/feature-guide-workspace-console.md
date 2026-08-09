# Frontend Guide: Workspace Provider Console

## Overview

The Workspace Provider Console gives admins two pages for managing the DB-backed
provider registry that powers the workspace service:

- `/workspace/providers` — browse the 12 supported provider definitions.
- `/workspace/app-configs` — CRUD for provider app configurations (OAuth apps +
  PAT credentials) and ad-hoc connection testing.

Both pages are authenticated and live in the portal shell.

## Route + Nav

- Routes are declared in `src/constants/routes.constants.ts`:
  - `ROUTES.WORKSPACE_PROVIDERS = '/workspace/providers'`
  - `ROUTES.WORKSPACE_APP_CONFIGS = '/workspace/app-configs'`
- Sidebar entries (`src/constants/sidebar.constants.ts`) use `Package` and
  `KeyRound` lucide icons.
- All labels are driven by i18n keys `nav.workspaceProviders` and
  `nav.workspaceAppConfigs`, with strings in all 13 locales.

## Data Layer

- Repository: `src/repositories/workspace/provider-registry.repository.ts`
  wraps the workspace service endpoints under `/api/v1/workspace/providers` and
  `/api/v1/workspace/provider-app-configs`, plus the ad-hoc
  `/api/v1/workspace/oauth/test-connection` and `.../test-pat`.
- Query keys live in `src/repositories/shared/query-keys.ts` under
  `workspaceProviders` and `workspaceProviderAppConfigs`.
- Hooks:
  - `useProviderCatalog()` — list providers.
  - `useProviderAppConfigs(provider?)` — list configs (optionally filtered by
    provider).
  - `useCreateProviderAppConfig()`, `useUpdateProviderAppConfig()`,
    `useDeleteProviderAppConfig()` — mutations.
  - `useTestConnection()` — POST `/workspace/oauth/test-connection` and expose
    the last result.
  - `useWorkspaceAppConfigsPage()` — controller hook orchestrating the above.

## Components

- `ProviderCard` — renders one provider catalog tile with capability chips and
  an "Available" / "Coming soon" badge based on
  `IMPLEMENTED_WORKSPACE_ADAPTERS`.
- `AppConfigRow` — single table row for an app configuration with Test + Delete
  actions.
- `DynamicConfigForm` — renders form inputs from `provider.configSchema`,
  respecting `appliesToAuthModes` to hide OAuth-only fields in PAT mode (and
  vice versa). Uses `Textarea` for `textarea` fields, password inputs for
  secret fields.
- `AppConfigCreateDialog` — create dialog hosting provider picker, name field,
  optional description, auth-mode picker, and `DynamicConfigForm`.

TSX files are pure render composition. All logic lives in
`useWorkspaceAppConfigsPage`.

## Enums

Four enums live in `src/enums/` and replace the old string literal unions:

- `WorkspaceProviderAuthMode` — `OAUTH2`, `PAT`, `BASIC`, `SERVICE_ACCOUNT`,
  `NONE`.
- `WorkspaceProviderDefinitionStatus` — `ACTIVE`, `BETA`, `DEPRECATED`,
  `DISABLED`.
- `WorkspaceProviderAppConfigStatus` — `DRAFT`, `READY`, `DISABLED`, `INVALID`.
- `WorkspaceProviderFieldType` — `text`, `textarea`, `secret`, `url`, `email`,
  `number`, `boolean`, `enum`, `multi_select`, `json`, `scope_picker`,
  `region_picker`, `tenant_selector`, `hidden`.

## i18n

All strings live under `workspaceProviders.catalog.*` and
`workspaceProviders.appConfigs.*` in every locale. Column headers and form
labels are locale-aware. Arabic translations respect the existing RTL layout.

## Security Notes

- Secrets are only sent in the `secretConfig` field on create/update. The
  response never echoes them back — QA asserts this.
- The `encrypted_secret` column is the only place secrets live at rest.
- Auth is enforced at the nginx/controller layer; anonymous requests to
  either endpoint return 401. QA covers this.

## QA Script

`qa/test-workspace-frontend-console.sh` exercises both pages' backing APIs,
creates + deletes an app config, verifies DB persistence and encryption, and
scans the workspace-service logs for unhandled rejections. Must pass with
0 failures before release.
