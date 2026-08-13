# Deployment Observability Design

## Objective

Make production deployment activity visible without relying on refreshing the web application. GitHub Actions remains the authoritative deployment history, while ClawAI exposes a protected super-admin view of the server's last reported deployment state. Deployment success and failure notifications reuse the existing SMTP configuration.

## Scope

This feature adds:

- a durable, atomic deployment-status record on the production host;
- explicit deployment phases and failure details from the existing deployment script;
- a GitHub Actions deployment summary for every attempt;
- best-effort SMTP notifications for success and failure;
- a super-admin-only deployment status API and `/admin/deployment` page;
- navigation and localized UI copy in all supported locales.

This feature does not add an external monitoring vendor, allow deployment controls from the UI, expose logs or secrets, change the existing CI-to-release-to-deploy trigger, or edit production files outside the Git-controlled deployment process.

## Sources of truth

GitHub Actions and the protected `production` Environment are authoritative for workflow history and logs. The server status record is authoritative for the most recent state reported by `scripts/deploy-prod.sh`. The application page is a read-only projection and must clearly identify stale status.

The server writes `.deploy/status.json` atomically. It contains only non-secret operational metadata:

```json
{
  "schemaVersion": 1,
  "state": "completed",
  "phase": "completed",
  "targetSha": "40-character commit SHA",
  "previousSha": "40-character commit SHA or null",
  "deployedSha": "40-character commit SHA or null",
  "version": "semantic version or null",
  "services": ["claw-frontend", "claw-nginx"],
  "startedAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp",
  "completedAt": "ISO-8601 timestamp or null",
  "workflowUrl": "GitHub Actions URL or null",
  "failureCode": "bounded machine-readable code or null"
}
```

Allowed states are `running`, `completed`, and `failed`. Running phases are `preparing`, `planning`, `building`, `reloading_nginx`, and `verifying`. Failure details are bounded codes, never raw command output.

## Deployment data flow

The production workflow supplies the GitHub run URL to `deploy-prod.sh` as non-secret metadata. The script creates the status record only after acquiring the deployment lock and validating the target. Each meaningful phase replaces the JSON file through a temporary file and atomic rename. A trap records `failed` if the script exits unsuccessfully after status tracking begins. Successful health verification records `completed` after `.deploy/deployed-sha` advances.

The script continues to reject tracked server changes, build before recreation, deploy exact SHAs, preserve old containers on build failure, and leave database infrastructure untouched.

## GitHub visibility

The deployment workflow always writes `$GITHUB_STEP_SUMMARY`, including:

- workflow result;
- target SHA and application version;
- production URL;
- workflow URL;
- deployment start and finish times;
- the server-reported final state and deployed SHA when available.

The summary-writing step uses `if: always()` and must not print SSH credentials, environment contents, or raw server logs. The existing `production` Environment continues to provide GitHub's deployment history surface.

## Email notifications

Notifications reuse `CONTACT_EMAIL_ENABLED`, `CONTACT_EMAIL_PROVIDER`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO`, and `CONTACT_SMTP_*`. No second SMTP stack or provider-specific dependency is introduced.

The workflow invokes a repository-owned notification script after the deployment attempt. That script uses the existing shared SMTP utility and sends to `CONTACT_EMAIL_TO` only when email is enabled, provider is `smtp`, the recipient is present, and SMTP configuration is valid. It sends one concise notification per workflow attempt:

- success: version, deployed SHA, duration, production URL, workflow link;
- failure: target SHA, safe failure phase/code when available, duration, workflow link.

Notification delivery is best effort. A mail failure is visible in the workflow summary but never changes a successful deployment into a failure. Subjects and bodies contain no credentials, environment values, command output, user data, or private logs.

The production workflow obtains SMTP values from GitHub Environment secrets. The same variable names are used so operators can copy the already-configured production SMTP values without learning a second configuration model. Secrets are never read back from the server.

## Protected status API

The health service owns the internal operational status endpoint because it already aggregates system health. A new admin endpoint reads the status record through its configured read-only mount and validates it against a strict shared contract. It returns only the bounded status document plus an `isStale` calculation.

Authorization requires the existing `ADMIN_SYSTEM_VIEW` permission and super-admin identity. Ordinary admins and users receive the existing forbidden response. The endpoint never accepts a filesystem path, returns raw files, exposes environment configuration, or proxies GitHub credentials.

If the file is absent, malformed, or unreadable, the endpoint returns a safe `unknown` projection rather than server internals. A running state becomes stale after 30 minutes without an update. Completed and failed states remain historical and are not marked stale solely due to age.

## Admin page

The frontend adds `/admin/deployment`, linked from the existing admin navigation only for super admins. The read-only page shows:

- current state and phase;
- application version;
- abbreviated target and deployed SHAs;
- started, updated, and completed timestamps;
- affected services;
- stale-state warning;
- production URL and GitHub workflow link when present.

The page provides no deploy, retry, restart, rollback, or log-view controls. It follows existing admin components, loading/error patterns, permission handling, and responsive ClawAI styling. Every user-facing string is added to all 13 locale dictionaries and the typed i18n contract.

## Security and privacy

- Status values are allowlisted and schema-validated.
- SHAs must be full hexadecimal commit IDs at ingestion; the UI abbreviates them.
- Workflow URLs must use `https://github.com/` and are rendered with safe external-link attributes.
- Service names come from the deployment plan, not arbitrary command output.
- Failure information is a fixed code, never a stack trace or log fragment.
- API access requires both super-admin identity and `ADMIN_SYSTEM_VIEW`.
- SMTP secrets exist only in GitHub Environment secrets and application/server environment configuration.
- Email delivery never blocks or rolls back deployment.

## Failure behavior

- If status persistence fails, deployment stops before container mutation because visibility is a production safety requirement.
- If a later deployment phase fails, the exit trap records `failed` best-effort while preserving the original exit code.
- If email fails, deployment result is unchanged and the GitHub summary reports notification failure.
- If the status API cannot read or validate the record, it returns `unknown` without filesystem details.
- If a running status is stale, the page prominently warns that the deployment may have been interrupted.

## Testing and verification

Tests must be written and observed failing before production implementation. Coverage includes:

- atomic status writes and every deployment state transition;
- failure trapping without masking the original failure;
- absence of secrets and raw logs in the status record and email;
- workflow summary execution on success and failure;
- disabled, successful, and failed SMTP notification behavior;
- strict status schema and safe malformed/missing-file fallback;
- super-admin authorization and rejection of ordinary admins/users;
- frontend loading, unknown, running, stale, completed, and failed states;
- safe GitHub links and abbreviated SHAs;
- navigation visibility and all 13 locale keys;
- existing deployment, health-service, frontend, knowledge, inventory, nginx, and Git hooks.

Production validation occurs only after merge through the existing automatic deployment. Read-only SSH verification confirms the status file, clean checkout, matching deployed SHA, healthy containers, and no leaked secrets. The GitHub summary and notification result are checked in the corresponding production Environment deployment.
