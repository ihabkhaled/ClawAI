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

Update 2026-10-04: Hugging Face, Pollinations, NVIDIA NIM and AI Horde run as data
on a definition (base URL, list format, chat path, key header), not as adapters;
recipes are in the provider catalog. Custom providers show their own name
everywhere. Open: RBAC, device matrix, accessibility/performance and GitHub CI
lanes; production was not reachable from the work machine, so the production
fix is the same chat-path setting applied there after deploy.
