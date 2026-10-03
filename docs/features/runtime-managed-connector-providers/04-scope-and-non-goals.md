# Scope and non-goals

## Included

- Connector-service provider definition CRUD, permission guard, paging/search,
  URL/path validation, mutation audit, connector association, encryption reuse.
- One trusted OpenAI-compatible runtime adapter family.
- Provider key in model catalog and routing deployment identity.
- Responsive localized Admin screen to manage definitions and create connectors.
- NVIDIA NIM mocked discovery as the four-provider-pack compatibility check.
- Built-in provider registry rows, safe active-state controls, and connector
  backfill that preserves connector and model records.

## Excluded

- Hugging Face inference-task endpoints, Pollinations image/audio/video APIs, and
  AI Horde's asynchronous queue/poll protocol.
- Runtime executable code, arbitrary request headers, arbitrary adapter family,
  dynamic pricing ingestion, or free-inference guarantees.
- Live NVIDIA smoke: no configured credential was used in this test.
