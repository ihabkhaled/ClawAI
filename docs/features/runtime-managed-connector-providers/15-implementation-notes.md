# Implementation notes

Provider keys are uppercase, at least two characters, and cannot equal the
generic sentinel. Custom connector auth must match the definition. The adapter
family is fixed to OpenAI-compatible; model discovery accepts OpenAI list
responses only. Connector PAYG defaults to the definition's false default.

The connector/provider relationship is the source for custom model display name,
catalog identity, health identity, snapshot identity, and routing lookup. Routing
uses one enum sentinel plus the runtime key; a custom key never becomes code.

Built-in definitions are linked by `connector_provider`. Their status is
mutable, but identity and execution fields are protected. Preset entries still
resolve through `CONNECTOR_PRESETS`; the eight bespoke providers still resolve
through their existing adapters. New built-in connectors are linked to their
definition at creation, and inactive definitions are excluded from provider
lookup and model snapshots.

Provider updates that alter execution configuration are refused while connectors
reference the definition. Deactivation is allowed. A previously connected
definition cannot be physically deleted.

## Change record — 2026-10-03

- **Requested by:** repository owner through the provider-management prompt
  packs.
- **Before:** administrators could not persist custom compatible definitions,
  and built-in providers had no managed active state.
- **Now:** administrators can manage custom definitions and connectors, and
  activate or deactivate seeded built-ins without changing adapter identity.
  Custom model identity is carried through connector catalog and routing.
- **Why:** add compatible providers without code changes for each provider key,
  while keeping protocol behavior versioned and validated.
- **Alternative considered:** implement all four free-connector pack protocols
  now. Only NVIDIA NIM fits the generic adapter; Hugging Face, Pollinations and
  AI Horde need separate protocols and remain excluded.
- **Verification:** see `../../qa-evidence/2026-10-03-runtime-managed-connector-providers.md`.
- **Revisit when:** a new specialized provider is selected or protocol/model
  identity behavior changes.
