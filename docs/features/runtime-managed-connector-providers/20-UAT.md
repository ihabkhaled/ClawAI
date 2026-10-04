# UAT

## Walkthrough

1. As an administrator, open Connectors → Connector providers.
2. Create `NVIDIA_NIM` with its verified public base URL, `/v1/models`, OpenAI
   list format, and API-key auth.
3. Create a connector from the provider row with an API key; confirm the key is
   masked and never shown again.
4. Test the connection, sync models, expose one model, run connector discovery,
   and make a normal model request.
5. Deactivate the definition and confirm it disappears from catalog/routing while
   history remains. Reactivate and repeat health/sync/exposure checks.
6. Confirm Hugging Face task APIs, Pollinations media, and AI Horde async are not
   offered as supported integrations by this flow.

**Status:** Partial. The browser walkthrough covered definition create, edit,
deactivate, reactivate and delete; direct API CRUD also passed. Creating a
connector from the provider page, submitting its credential, model sync,
exposure, live chat, built-in status control interaction, and live
inactive-catalog/routing checks remain unrun. Service tests cover built-in
status-only mutation and protected edits/deletes. The full walkthrough is not
accepted yet; see the linked QA evidence record.
