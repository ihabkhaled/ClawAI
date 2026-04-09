# ClawAI AI Provider Integration Catalog

This document catalogs all AI providers integrated with ClawAI, including setup instructions, available models, capability flags, and classification metadata.

---

## Provider Overview

| Provider      | Type  | Models                         | Streaming | Tools | Vision | Audio | Privacy Class | Cost Class    | Latency Class |
| ------------- | ----- | ------------------------------ | --------- | ----- | ------ | ----- | ------------- | ------------- | ------------- |
| OpenAI        | Cloud | GPT-4o, GPT-4o-mini            | Yes       | Yes   | Yes    | No    | CLOUD         | STANDARD      | LOW           |
| Anthropic     | Cloud | Claude Sonnet 4, Claude Opus 4 | Yes       | Yes   | Yes    | No    | CLOUD         | STANDARD-HIGH | MEDIUM        |
| Google Gemini | Cloud | Gemini 2.5 Flash               | Yes       | Yes   | Yes    | No    | CLOUD         | LOW           | LOW           |
| DeepSeek      | Cloud | deepseek-chat                  | Yes       | Yes   | No     | No    | CLOUD         | LOW           | MEDIUM        |
| Local Ollama  | Local | 5 models (see below)           | No        | No    | No     | No    | LOCAL         | FREE          | VARIABLE      |

---

## 1. OpenAI

### Overview

OpenAI provides GPT-series large language models. ClawAI integrates via the OpenAI Chat Completions API, which is also the de facto standard for many compatible providers.

### Endpoint

- **Base URL:** `https://api.openai.com/v1`
- **Chat Completions:** `POST /chat/completions`
- **Authentication:** Bearer token in `Authorization` header

### Setup Instructions

1. Obtain an API key from [platform.openai.com](https://platform.openai.com/api-keys).
2. In ClawAI, navigate to Connectors > Add Connector.
3. Select provider: **OPENAI**.
4. Enter the API key. It will be encrypted with AES-256-GCM before storage.
5. Leave the base URL empty (defaults to `https://api.openai.com/v1`).
6. Click "Test Connection" to verify.
7. Click "Sync Models" to populate available models.

### Models

| Model       | Context Window | Best For                                             | Streaming | Tools | Vision | Audio |
| ----------- | -------------- | ---------------------------------------------------- | --------- | ----- | ------ | ----- |
| gpt-4o      | 128K tokens    | General purpose, creative writing, complex reasoning | Yes       | Yes   | Yes    | No    |
| gpt-4o-mini | 128K tokens    | Fast responses, simple tasks, cost optimization      | Yes       | Yes   | Yes    | No    |

### Routing Rules (AUTO Mode)

| Task Type                      | Routes To   |
| ------------------------------ | ----------- |
| Creative writing, general chat | gpt-4o-mini |
| Complex multi-step reasoning   | gpt-4o      |

### Cost Class: STANDARD

- gpt-4o: Input $2.50/1M tokens, Output $10.00/1M tokens (approximate)
- gpt-4o-mini: Input $0.15/1M tokens, Output $0.60/1M tokens (approximate)

### Latency Class: LOW

- gpt-4o-mini: Typical 0.5-2s for short responses
- gpt-4o: Typical 2-8s for complex queries

### Privacy Class: CLOUD

- Data is sent to OpenAI's servers.
- Subject to OpenAI's data usage policies.
- Not recommended for highly sensitive data; use LOCAL_ONLY or PRIVACY_FIRST routing modes instead.

### Notes

- OpenAI's Chat Completions API format is used as the standard interface. Other cloud providers (Anthropic, Gemini, DeepSeek) are called through OpenAI-compatible endpoints or adapters.
- Rate limits depend on the API tier. ClawAI applies its own rate limiting (default: 100 req/min) on top of provider limits.

---

## 2. Anthropic

### Overview

Anthropic provides the Claude family of models, known for strong code generation, reasoning, and safety. ClawAI integrates via Anthropic's API using the OpenAI-compatible chat completions format.

### Endpoint

- **Base URL:** `https://api.anthropic.com/v1`
- **Chat Completions:** `POST /chat/completions`
- **Authentication:** Bearer token (API key) in `Authorization` header

### Setup Instructions

1. Obtain an API key from [console.anthropic.com](https://console.anthropic.com/).
2. In ClawAI, navigate to Connectors > Add Connector.
3. Select provider: **ANTHROPIC**.
4. Enter the API key (AES-256-GCM encrypted at rest).
5. Leave the base URL empty (defaults to `https://api.anthropic.com/v1`).
6. Click "Test Connection" to verify.
7. Click "Sync Models" to populate available models.

### Models

| Model           | Context Window | Best For                                                        | Streaming | Tools | Vision | Audio |
| --------------- | -------------- | --------------------------------------------------------------- | --------- | ----- | ------ | ----- |
| claude-sonnet-4 | 200K tokens    | Coding, debugging, code review, detailed analysis               | Yes       | Yes   | Yes    | No    |
| claude-opus-4   | 200K tokens    | Deep reasoning, architecture decisions, complex problem solving | Yes       | Yes   | Yes    | No    |

### Routing Rules (AUTO Mode)

| Task Type                                | Routes To       |
| ---------------------------------------- | --------------- |
| Coding, debugging, code review           | claude-sonnet-4 |
| Deep reasoning, architecture discussions | claude-opus-4   |

### Cost Class: STANDARD to HIGH

- claude-sonnet-4: Input $3.00/1M tokens, Output $15.00/1M tokens (approximate)
- claude-opus-4: Input $15.00/1M tokens, Output $75.00/1M tokens (approximate)

### Latency Class: MEDIUM

- claude-sonnet-4: Typical 2-6s for code-related queries
- claude-opus-4: Typical 5-15s for complex reasoning

### Privacy Class: CLOUD

- Data is sent to Anthropic's servers.
- Anthropic has strong data handling policies (no training on API data by default).
- Preferred fallback provider in PRIVACY_FIRST mode (after local models).

### Notes

- Anthropic is the preferred provider for coding tasks and deep reasoning in AUTO mode.
- Claude models excel at following complex instructions and generating well-structured code.
- The PRIVACY_FIRST routing mode uses Anthropic as the cloud fallback due to its privacy-favorable data policies.

---

## 3. Google Gemini

### Overview

Google's Gemini models are multimodal, excelling at image understanding, video analysis, web search integration, and file/data analysis. ClawAI integrates via the Gemini API using the OpenAI-compatible chat completions format.

### Endpoint

- **Base URL:** `https://generativelanguage.googleapis.com/v1beta`
- **Chat Completions:** `POST /chat/completions` (via OpenAI-compatible endpoint)
- **Image Generation:** `POST /models/{model}:generateContent`
- **Authentication:** API key as Bearer token or query parameter

### Setup Instructions

1. Obtain an API key from [aistudio.google.com](https://aistudio.google.com/apikey).
2. In ClawAI, navigate to Connectors > Add Connector.
3. Select provider: **GEMINI**.
4. Enter the API key (AES-256-GCM encrypted at rest).
5. Leave the base URL empty (defaults to the standard Gemini endpoint).
6. Click "Test Connection" to verify.
7. Click "Sync Models" to populate available models.

### Models

| Model            | Context Window | Best For                                                                  | Streaming | Tools | Vision | Audio |
| ---------------- | -------------- | ------------------------------------------------------------------------- | --------- | ----- | ------ | ----- |
| gemini-2.5-flash | 1M tokens      | File/data analysis, image understanding, web search, fast general purpose | Yes       | Yes   | Yes    | No    |

### Routing Rules (AUTO Mode)

| Task Type                      | Routes To        |
| ------------------------------ | ---------------- |
| Image/video/YouTube/web search | gemini-2.5-flash |
| File/data analysis             | gemini-2.5-flash |

### Cost Class: LOW

- gemini-2.5-flash: Input $0.15/1M tokens, Output $0.60/1M tokens (approximate, generous free tier)

### Latency Class: LOW

- gemini-2.5-flash: Typical 0.5-3s, very fast for its capability level

### Privacy Class: CLOUD

- Data is sent to Google's servers.
- Subject to Google Cloud's data handling terms.

### Notes

- Gemini is the preferred provider for multimodal tasks (image understanding, video, web search) in AUTO mode.
- The large context window (1M tokens) makes it ideal for file analysis with large documents.
- Also used for image generation via the Imagen integration.

---

## 4. DeepSeek

### Overview

DeepSeek provides cost-effective models specializing in mathematical reasoning, algorithms, and general-purpose chat. ClawAI integrates via DeepSeek's OpenAI-compatible API.

### Endpoint

- **Base URL:** `https://api.deepseek.com/v1`
- **Chat Completions:** `POST /chat/completions`
- **Authentication:** Bearer token in `Authorization` header

### Setup Instructions

1. Obtain an API key from [platform.deepseek.com](https://platform.deepseek.com/).
2. In ClawAI, navigate to Connectors > Add Connector.
3. Select provider: **DEEPSEEK**.
4. Enter the API key (AES-256-GCM encrypted at rest).
5. Leave the base URL empty (defaults to `https://api.deepseek.com/v1`).
6. Click "Test Connection" to verify.
7. Click "Sync Models" to populate available models.

### Models

| Model         | Context Window | Best For                                         | Streaming | Tools | Vision | Audio |
| ------------- | -------------- | ------------------------------------------------ | --------- | ----- | ------ | ----- |
| deepseek-chat | 128K tokens    | Math, algorithms, cost-effective general purpose | Yes       | Yes   | No     | No    |

### Routing Rules (AUTO Mode)

| Task Type                            | Routes To                          |
| ------------------------------------ | ---------------------------------- |
| Math, algorithms, numerical analysis | deepseek-chat (or local phi3:mini) |

### Cost Class: LOW

- deepseek-chat: Input $0.14/1M tokens, Output $0.28/1M tokens (approximate, among the cheapest cloud options)

### Latency Class: MEDIUM

- deepseek-chat: Typical 2-5s depending on complexity

### Privacy Class: CLOUD

- Data is sent to DeepSeek's servers.
- Review DeepSeek's data handling policies for your compliance requirements.

### Notes

- DeepSeek is the primary choice for mathematical and algorithmic tasks in AUTO mode.
- Extremely cost-effective, making it a good COST_SAVER fallback.
- Vision/image capabilities are not supported.

---

## 5. Local Ollama

### Overview

Ollama is a local AI runtime that runs models on the user's hardware. No data leaves the local machine, providing maximum privacy. ClawAI installs and manages 5 local models automatically on first startup.

### Endpoint

- **Base URL:** Configured via `OLLAMA_BASE_URL` environment variable (default: `http://ollama:11434`)
- **Generation:** `POST /api/generate`
- **Model List:** `GET /api/tags`
- **Authentication:** None required (local service)

### Setup Instructions

1. Ollama is included in the Docker Compose configuration and starts automatically.
2. On first startup, the claw-ollama-service auto-pulls 5 default models.
3. Models are synced to the database and assigned default roles.
4. No API key or external account is required.
5. Additional models can be pulled via the Models page or POST /api/v1/ollama/pull.

### Models

| Model       | Parameters | Size  | Best For                                                 | Role Assignment       | Streaming | Tools | Vision | Audio |
| ----------- | ---------- | ----- | -------------------------------------------------------- | --------------------- | --------- | ----- | ------ | ----- |
| gemma3:4b   | 4B         | 3.3GB | Default local chat, routing decisions, memory extraction | ROUTER, FALLBACK_CHAT | No        | No    | No     | No    |
| llama3.2:3b | 3B         | 2.0GB | Local reasoning tasks                                    | REASONING             | No        | No    | No     | No    |
| phi3:mini   | 3.8B       | 2.2GB | Coding, math, structured output                          | CODING                | No        | No    | No     | No    |
| gemma2:2b   | 2B         | 1.6GB | Fast general-purpose responses                           | FALLBACK_CHAT         | No        | No    | No     | No    |
| tinyllama   | 1.1B       | 637MB | Ultra-fast routing fallback, simple tasks only           | ROUTER (fallback)     | No        | No    | No     | No    |

### Model Roles

| Role          | Description                                                               | Default Model |
| ------------- | ------------------------------------------------------------------------- | ------------- |
| ROUTER        | Analyzes message content to determine optimal provider/model in AUTO mode | gemma3:4b     |
| FALLBACK_CHAT | Handles chat requests when cloud providers are unavailable                | gemma3:4b     |
| REASONING     | Handles reasoning and analytical tasks locally                            | llama3.2:3b   |
| CODING        | Handles coding and math tasks locally                                     | phi3:mini     |

### Routing Rules

| Routing Mode  | Behavior                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| LOCAL_ONLY    | Always uses local-ollama/gemma3:4b. No data leaves the machine.                                                                     |
| PRIVACY_FIRST | Uses local models when Ollama is healthy. Falls back to Anthropic only if local is unavailable.                                     |
| COST_SAVER    | Uses local models when healthy. Falls back to cheapest cloud provider.                                                              |
| AUTO          | The router model (gemma3:4b) analyzes each message. Routes simple Q&A, translations, and privacy-sensitive content to local models. |

### Cost Class: FREE

- No per-token costs.
- Only hardware costs (CPU/GPU, RAM, disk for model storage).
- Total disk requirement for all 5 models: approximately 9.7GB.

### Latency Class: VARIABLE

- Depends heavily on hardware (CPU vs GPU, RAM availability).
- gemma3:4b: 2-10s on CPU, 0.5-3s on GPU.
- tinyllama: 0.5-2s on CPU (smallest model).
- phi3:mini: 2-8s on CPU for coding tasks.

### Privacy Class: LOCAL

- No data leaves the local machine.
- Models run entirely within the Docker environment.
- Ideal for confidential, sensitive, or regulated data.
- The highest privacy guarantee available in ClawAI.

### Configuration

| Environment Variable     | Description                                             | Default             |
| ------------------------ | ------------------------------------------------------- | ------------------- |
| OLLAMA_BASE_URL          | URL of the Ollama runtime                               | http://ollama:11434 |
| OLLAMA_ROUTER_MODEL      | Model used for AUTO routing decisions                   | gemma3:4b           |
| OLLAMA_ROUTER_TIMEOUT_MS | Timeout for routing decisions before heuristic fallback | 10000 (10s)         |
| MEMORY_EXTRACTION_MODEL  | Model used for automatic memory extraction              | gemma3:4b           |

### Health Check

- GET /api/v1/ollama/health?runtime=OLLAMA returns the runtime health status.
- Health is checked by the health aggregator and reported on the Observability dashboard.
- If Ollama is unhealthy, PRIVACY_FIRST and COST_SAVER modes fall back to cloud providers.

### Notes

- Models are auto-synced from the Ollama runtime to the database on ollama-service startup.
- Additional models can be pulled from the Ollama registry at any time.
- Model role assignments can be changed via POST /api/v1/ollama/assign-role.
- The router model runs with temperature=0 for deterministic routing decisions.
- Router output is validated with a Zod schema to ensure structured, parseable routing decisions.
- When pulling models, the system sends the full model name with tag (e.g., "gemma3:4b") to the Ollama runtime.

---

## Provider Comparison Matrix

### Capability Comparison

| Capability          | OpenAI       | Anthropic             | Gemini       | DeepSeek    | Local Ollama                         |
| ------------------- | ------------ | --------------------- | ------------ | ----------- | ------------------------------------ |
| Text chat           | Excellent    | Excellent             | Excellent    | Good        | Good (limited by model size)         |
| Code generation     | Good         | Excellent             | Good         | Good        | Fair (phi3:mini best)                |
| Reasoning           | Good         | Excellent (Opus)      | Good         | Good (math) | Fair (llama3.2:3b)                   |
| Data analysis       | Good         | Good                  | Excellent    | Good        | Poor                                 |
| Image understanding | Yes (GPT-4o) | Yes (Claude)          | Yes (Gemini) | No          | No                                   |
| Image generation    | Via DALL-E   | No                    | Via Imagen   | No          | Via Stable Diffusion (if configured) |
| Web/search          | No           | No                    | Yes          | No          | No                                   |
| Privacy             | Cloud        | Cloud (strong policy) | Cloud        | Cloud       | Full local                           |
| Offline capable     | No           | No                    | No           | No          | Yes                                  |

### Task-to-Provider Routing (AUTO Mode Summary)

| Task Category                  | Primary Provider            | Fallback                    |
| ------------------------------ | --------------------------- | --------------------------- |
| Coding, debugging, code review | Anthropic / claude-sonnet-4 | OpenAI / gpt-4o             |
| Deep reasoning, architecture   | Anthropic / claude-opus-4   | OpenAI / gpt-4o             |
| Image/video/web search         | Gemini / gemini-2.5-flash   | OpenAI / gpt-4o             |
| Math, algorithms               | DeepSeek / deepseek-chat    | Local / phi3:mini           |
| Creative writing, chat         | OpenAI / gpt-4o-mini        | Local / gemma3:4b           |
| Simple Q&A, translations       | Local / gemma3:4b           | OpenAI / gpt-4o-mini        |
| File/data analysis             | Gemini / gemini-2.5-flash   | Anthropic / claude-sonnet-4 |
| Privacy-sensitive              | Local / gemma3:4b           | Never cloud                 |

### Cost Comparison (Approximate, per 1M tokens)

| Provider / Model            | Input Cost | Output Cost | Relative Cost |
| --------------------------- | ---------- | ----------- | ------------- |
| Local Ollama (all models)   | $0.00      | $0.00       | Free          |
| DeepSeek / deepseek-chat    | $0.14      | $0.28       | Very Low      |
| Gemini / gemini-2.5-flash   | $0.15      | $0.60       | Very Low      |
| OpenAI / gpt-4o-mini        | $0.15      | $0.60       | Very Low      |
| OpenAI / gpt-4o             | $2.50      | $10.00      | Medium        |
| Anthropic / claude-sonnet-4 | $3.00      | $15.00      | Medium-High   |
| Anthropic / claude-opus-4   | $15.00     | $75.00      | High          |
