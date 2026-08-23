# Model Availability & Plan Entitlements — release notes (draft, in progress)

This branch is **not finished**. These notes cover only what has actually landed
and are updated as batches complete. Anything not listed here is not done.

## Added

- **Model exposure.** `ConnectorModel` now carries an `exposure` state
  (`UNEXPOSED` / `EXPOSED`). Discovering a model from a provider no longer makes
  it available to anyone; offering it is a separate, deliberate administrator
  decision.
- **Model kind.** `ConnectorModel` now carries a `kind`
  (`CHAT` / `EMBEDDING` / `RERANKER` / `TOOL`), so router-infrastructure and
  non-chat deployments can be kept out of a user's model picker.
- **Removal lifecycle.** `ModelLifecycle` gained `REMOVED`, and models record
  `last_seen_at`.

## Fixed

- **A provider hiccup can no longer erase inventory.** Model sync used to delete
  every stored model missing from the incoming provider listing. One truncated,
  rate-limited or briefly failing response permanently destroyed inventory rows,
  and with them the identity that plan entitlements and audit history point at.
  Missing models are now marked `REMOVED` and forced back to `UNEXPOSED`; the row
  and its id survive. A model that returns later comes back automatically, but
  stays unexposed until an administrator says otherwise.
- **The user model picker no longer offers non-chat deployments.** The catalog
  now requires an enabled connector, an `ACTIVE` model, an explicit `EXPOSED`
  state and `kind = CHAT`. Text-to-speech, transcribe, image and embedding
  deployments were previously selectable as if they were chat models.
- **`GET /connectors/:id/models` now requires `ADMIN_CONNECTORS_MANAGE`.** It was
  the only route on that controller with no permission decorator, and it lists a
  connector's full inventory including unexposed models.

## Upgrade notes

- Two migrations ship together. The first adds the columns with safe defaults;
  the second is a one-time compatibility backfill that grandfathers exactly the
  models that were already reachable — `ACTIVE` on an enabled connector.
- **No user loses a model on upgrade.** Rehearsed against a production-like
  database: the old catalog query returned 160 models, and after the backfill the
  new catalog query returns the same 160.
- Every model discovered _after_ this release arrives `UNEXPOSED` and needs a
  deliberate decision before users see it.
- A fresh install has no rows, so the backfill is a no-op there.

## Not yet in this release

Stated plainly so nobody reads more into the branch than is there:

- The runtime authorization gates in chat-service and routing-service do **not**
  yet consult exposure. A crafted API request naming an unexposed model is still
  accepted by those paths. Until that lands, this is a catalog-hygiene and
  data-durability change, **not** a security boundary.
- Plan model access still accepts free-text `(provider, model)` pairs with no
  inventory validation, so an administrator can still persist a model that was
  never synced.
- There is no admin exposure UI yet, and the expose/unexpose API is still in
  progress.
