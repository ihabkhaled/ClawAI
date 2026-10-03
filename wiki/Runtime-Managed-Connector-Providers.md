**Wiki source:** [runtime-managed connector provider dossier](https://github.com/ihabkhaled/ClawAI/blob/main/docs/features/runtime-managed-connector-providers/00-intake.md)

# Runtime Managed Connector Providers

Administrators can manage custom OpenAI-compatible provider definitions and
built-in availability from `/connectors/providers`. Built-ins expose safe
status-only controls and retain their existing adapters. Existing connectors
are linked during migration without rewriting credentials or model history.
Custom model identity is carried from connector discovery through routing.

- [Requirements, scope and status](https://github.com/ihabkhaled/ClawAI/blob/main/docs/features/runtime-managed-connector-providers/02-product-requirements.md)
- [Architecture decision ADR-157](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-157-runtime-managed-connector-providers.md)
- [API reference](https://github.com/ihabkhaled/ClawAI/blob/main/docs/12-reference/api-reference-connectors.md)
- [QA evidence and open release lanes](https://github.com/ihabkhaled/ClawAI/blob/main/docs/qa-evidence/2026-10-03-runtime-managed-connector-providers.md)

Release is currently NO-GO while DB migration, RBAC, accessibility/performance,
built-in UI UAT, live NIM and GitHub CI lanes remain open. NVIDIA NIM was tested
only with mocked model-list responses. Hugging Face, Pollinations and AI Horde
require separate adapters.
