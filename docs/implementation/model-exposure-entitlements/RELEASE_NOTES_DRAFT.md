# Model Availability & Plan Entitlements

Connector-synchronised model inventory, admin-controlled exposure, validated
plan entitlements, and server-side enforcement on the model execution path.

## Added

- **Model exposure.** `ConnectorModel` carries an `exposure` state
  (`UNEXPOSED` / `EXPOSED`). Discovering a model from a provider no longer makes
  it available to anyone; offering it is a separate, deliberate administrator
  decision, and a newly discovered model always arrives unexposed.
- **Model kind.** `ConnectorModel` carries a `kind`
  (`CHAT` / `EMBEDDING` / `RERANKER` / `TOOL`), so router-infrastructure and
  non-chat deployments stay out of a user's model picker.
- **Admin exposure API.** `PUT /connectors/:id/models/exposure` exposes or
  unexposes a bounded set of a connector's models, and reports which of them
  were already exposed so an unexpose can state what it removed.
- **Admin Model Exposure screen.** Search, filter, bulk select, expose and
  unexpose, with each row showing the exact model id alongside the display name.
  The impact of an unexpose is shown _before_ the action, not after.
- **Cross-service validation.** `POST /internal/connectors/models/validate-exposed`
  answers which `(provider, model)` pairs are real, exposed, chat-capable
  deployments — in one query, without saying why a pair failed.

## Fixed

- **A provider hiccup can no longer erase inventory.** Model sync deleted every
  stored model missing from the incoming listing, so one truncated or
  rate-limited response permanently destroyed rows and the identity plan
  entitlements pointed at. Missing models are now marked `REMOVED` and forced
  back to `UNEXPOSED`; the row and its id survive, and a model that returns
  comes back automatically but stays unexposed until an administrator says so.
- **Plans can no longer be given models that do not exist.** `provider` and
  `model` were free strings with no enum and no lookup, so any typo or guess
  became a durable entitlement. Every submitted row is now validated against
  real connector inventory before anything is written; one unknown pair rejects
  the whole request rather than silently saving the rest.
- **The plan editor no longer invites invalid input.** Two free-text boxes are
  replaced by a single selector over exposed deployments, so provider and model
  cannot drift apart. Rows whose model is no longer exposed stay visible with a
  warning so they can be removed, and are never re-selectable.
- **An empty plan allow-list no longer means unlimited access.** It meant "no
  restriction" regardless of plan, so a plan configured to grant nothing was
  handed the entire catalogue. Only a plan explicitly in `ALLOW_ALL` mode is
  unrestricted now.
- **Unexposed models cannot execute.** A crafted request naming a model nobody
  exposed reached the provider. The send path now verifies exposure against
  connector inventory, cached briefly, failing closed. Administrators are not
  exempt.
- **Critic and research no longer fail open.** Both returned early when
  entitlements came back empty, quietly unlocking paid features in exactly the
  case where that is worst.
- **The user picker no longer offers non-chat deployments.** Text-to-speech,
  transcribe, image and embedding models were selectable as chat models.
- **`GET /connectors/:id/models` now requires `ADMIN_CONNECTORS_MANAGE`.** It was
  the only route on that controller with no permission decorator.

## Upgrade notes

- Two migrations ship together: one adds the columns with safe defaults, the
  other grandfathers exactly the models that were already reachable.
- **No user loses a model on upgrade.** Rehearsed against a production-like
  database: the old catalogue query returned 160 models; after the backfill the
  new query returns the same 160.
- Every model discovered _after_ this release arrives `UNEXPOSED`.
- A fresh install has no rows, so the backfill is a no-op.

## Not in this release

- AUTO routing is plan-aware but not yet exposure-aware. It routes over an
  already exposure-filtered catalogue, so the remaining gap is a crafted AUTO
  request naming an unexposed model.
- The admin exposure screen's hook and table are complete; the `/admin` route
  composing them is not wired.
- No Playwright burn-in, chaos suite, 300-case entitlement matrix, or
  large-catalogue performance measurement has been run.
