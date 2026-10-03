# Glossary — "connector" vs "local"

In this project **"connector" means the cloud connector**, never the local runtime.
This is the owner's vocabulary; read it that way in every request.

| Term in a request                             | Means                                                                     | Provider id                                  | Lives in                                           |
| --------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| "connector", "ollama connector"               | The **cloud API connector** (calls `ollama.com/api/chat` with an API key) | `OLLAMA_CLOUD` (e.g. `OLLAMA_CLOUD/glm-5.2`) | `claw-connector-service`, `/connectors` admin page |
| "ollama local", "local ollama", "local model" | The self-hosted Ollama runtime on this machine                            | `local-ollama`                               | `claw-ollama-service` + `claw-ollama` container    |

## How to apply

- "Test the ollama connector models (kimi, glm, deepseek)" = pick the **`OLLAMA_CLOUD`** entries
  in the model picker, not the "Ollama (Local)" group. A model name such as `kimi-k2.6:cloud`
  can appear under both; confirm the provider before sending.
- Never infer "local" from the word "ollama".
- Connector-service outages (e.g. a missing migration breaking `/connectors/available-models`
  and `/internal/connectors/models/validate-exposed`) hit **both** groups, because the model
  picker and the exposure check read connector-service's `connector_models` table.

Incident that created this entry: 2026-10-03, a test of "ollama connector" models was run
against the local group by mistake.
