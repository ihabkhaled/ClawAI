# ClawAI — Adapters Reference

> Adapters implement provider-specific integrations behind a common interface. The AdapterFactory resolves the correct adapter at runtime based on an enum value. This document catalogs all adapters.

---

## Adapter Pattern

```typescript
// Common interface (e.g., ProviderAdapter):
interface ProviderAdapter {
  healthCheck(config: ConnectorConfig): Promise<HealthCheckResult>;
  syncModels(config: ConnectorConfig): Promise<NormalizedModel[]>;
  getCapabilities(): ProviderCapabilities;
}

// Factory resolves by enum:
@Injectable()
class AdapterFactory {
  getAdapter(provider: ConnectorProvider): ProviderAdapter {
    switch (provider) {
      case ConnectorProvider.OPENAI:
        return this.openaiAdapter;
      case ConnectorProvider.OLLAMA:
        return this.ollamaAdapter;
      // ...
    }
  }
}
```

**Rules**:

- Adapters are `@Injectable()` NestJS providers
- Adapters registered in the feature module's `providers` array
- Adapters injected into the factory via constructor DI
- Never call adapters directly from controllers — always via factory → manager → service

---

## claw-connector-service Adapters (7)

These adapters implement `ProviderAdapter`:

### `openai.adapter.ts`

**Provider**: `ConnectorProvider.OPENAI`  
**API**: OpenAI REST API (`api.openai.com`)  
**healthCheck**: GET `/v1/models` — checks API key validity  
**syncModels**: GET `/v1/models` → filters for `gpt-*`, `o1-*`, `o3-*`, `dall-e-*` models  
**Capabilities**: streaming=true, tools=true, vision=true (gpt-4o), audio=false

### `anthropic.adapter.ts`

**Provider**: `ConnectorProvider.ANTHROPIC`  
**API**: Anthropic Messages API (`api.anthropic.com`)  
**healthCheck**: GET `/v1/models` with `x-api-key` header  
**syncModels**: GET `/v1/models` → maps Claude model list  
**Capabilities**: streaming=true, tools=true, vision=true, audio=false

### `gemini.adapter.ts`

**Provider**: `ConnectorProvider.GEMINI`  
**API**: Google Generative Language API  
**healthCheck**: GET `/v1beta/models?key={apiKey}`  
**syncModels**: GET `/v1beta/models` → filters `gemini-*` models  
**Capabilities**: streaming=true, tools=true, vision=true, audio=true (gemini-2.0)

### `bedrock.adapter.ts`

**Provider**: `ConnectorProvider.AWS_BEDROCK`  
**API**: AWS Bedrock (`bedrock.{region}.amazonaws.com`)  
**Auth**: AWS SigV4 signing (region + accessKey + secretKey from encrypted config)  
**syncModels**: Lists foundation models available in the configured region  
**Capabilities**: streaming=true, tools=true (varies by model), vision=false

### `deepseek.adapter.ts`

**Provider**: `ConnectorProvider.DEEPSEEK`  
**API**: DeepSeek API (OpenAI-compatible format)  
**syncModels**: Returns known DeepSeek model list (static, API doesn't have model list endpoint)  
**Capabilities**: streaming=true, tools=true, vision=false

### `grok.adapter.ts`

**Provider**: `ConnectorProvider.GROK`  
**API**: xAI Grok API (OpenAI-compatible format, `api.x.ai`)  
**syncModels**: GET `/v1/models`  
**Capabilities**: streaming=true, tools=false, vision=false

### `ollama.adapter.ts`

**Provider**: `ConnectorProvider.OLLAMA`  
**API**: Ollama API (ollama.com cloud or local `http://ollama:11434`)  
**healthCheck**: GET `{baseUrl}/api/tags`  
**syncModels**: Fetches cloud models via API + scrapes ollama.com catalog (250 max)  
**URL resolution**: localhost/127.0.0.1 → `OLLAMA_CLOUD_API_BASE_URL` (`https://ollama.com/api`)  
**Capabilities**: streaming=true, tools=false, vision=false  
**Catalog scraping**: Parses HTML from `ollama.com/library?sort=popular` + `ollama.com/search?c=cloud`

---

## claw-image-service Adapters (3)

These implement `ImageGenerationAdapter`:

### `openai-image.adapter.ts`

**Provider**: OpenAI DALL-E (`dall-e-2`, `dall-e-3`)  
**API**: `POST /v1/images/generations`  
**Output**: URL to generated image (hosted by OpenAI, temporary)

### `gemini-image.adapter.ts`

**Provider**: Google Imagen via Gemini API  
**API**: Gemini Generative Language API (image generation endpoint)  
**Output**: Base64-encoded image data

### `stable-diffusion.adapter.ts`

**Provider**: ComfyUI or Automatic1111 (Stable Diffusion web UI)  
**API**: Local `STABLE_DIFFUSION_URL` / `COMFYUI_BASE_URL`  
**Output**: Base64 or file path  
**Models**: FLUX.1, SD 3.5, SDXL, Kandinsky, Playground

---

## claw-file-generation-service Adapters (7)

These implement `FileGenerationAdapter`:

### `pdf.adapter.ts`

**Format**: PDF  
**Lib**: `pdfkit` or similar  
**Input**: Structured content from LLM (headings, paragraphs, tables)

### `docx.adapter.ts`

**Format**: Microsoft Word (DOCX)  
**Lib**: `docx` npm package  
**Input**: Structured content from LLM

### `csv.adapter.ts`

**Format**: CSV  
**Lib**: `csv-stringify`  
**Input**: Table data array from LLM

### `html.adapter.ts`

**Format**: HTML  
**Output**: Standalone HTML file with embedded CSS

### `md.adapter.ts`

**Format**: Markdown  
**Output**: Plain `.md` file (no processing needed, direct LLM output)

### `json.adapter.ts`

**Format**: JSON  
**Output**: Pretty-printed JSON (LLM must produce valid JSON)

### `txt.adapter.ts`

**Format**: Plain text  
**Output**: Plain `.txt` file (minimal processing)

---

## claw-ollama-service Runtime Adapters (5)

These implement `RuntimeAdapter` for different local AI inference engines:

### `ollama-runtime.adapter.ts`

**Engine**: Ollama  
**API**: `http://ollama:11434`  
**Used for**: All standard Ollama models (pull, run, list)

### `comfyui-runtime.adapter.ts`

**Engine**: ComfyUI  
**API**: `COMFYUI_BASE_URL`  
**Used for**: Image generation models (FLUX, SD, etc.)

### `llamacpp-runtime.adapter.ts`

**Engine**: llama.cpp (direct binary or llama-server)  
**Used for**: Ultra-low latency inference without full Ollama overhead

### `localai-runtime.adapter.ts`

**Engine**: LocalAI  
**API**: OpenAI-compatible REST  
**Used for**: OpenAI API-compatible models running locally

### `vllm-runtime.adapter.ts`

**Engine**: vLLM  
**Used for**: High-throughput batched inference

---

## claw-research-service Adapters (4)

These implement `SearchProviderAdapter`:

### `tavily.adapter.ts`

**Provider**: Tavily AI Search API  
**Config**: `TAVILY_API_KEY`  
**Output**: Structured search results with excerpts and scores

### `searxng.adapter.ts`

**Provider**: SearXNG (self-hosted meta-search)  
**Config**: `SEARXNG_BASE_URL`  
**Output**: Aggregated results from Google, Bing, DuckDuckGo, etc.

### `ollama-web.adapter.ts`

**Provider**: Ollama with web browsing capability  
**Used for**: AI-powered web search via local Ollama model

### `http-fetch.adapter.ts`

**Purpose**: Fetches and parses HTML pages for content extraction  
**Safety**: URL safety check before fetch, content safety check after

---

## claw-workspace-service Adapters (12)

These implement `WorkspaceConnectorAdapter` for enterprise integrations:

| Adapter                   | Platform             | Auth Method                | Key Operations              |
| ------------------------- | -------------------- | -------------------------- | --------------------------- |
| `github.adapter.ts`       | GitHub               | OAuth2 (user token) or PAT | repos, issues, PRs, commits |
| `gitlab.adapter.ts`       | GitLab               | OAuth2 or personal token   | projects, MRs, issues       |
| `jira.adapter.ts`         | Atlassian Jira       | OAuth2 (Atlassian Cloud)   | issues, boards, sprints     |
| `confluence.adapter.ts`   | Atlassian Confluence | OAuth2                     | spaces, pages, comments     |
| `slack.adapter.ts`        | Slack                | OAuth2                     | channels, messages, files   |
| `gmail.adapter.ts`        | Google Gmail         | OAuth2                     | threads, messages, labels   |
| `google-drive.adapter.ts` | Google Drive         | OAuth2                     | files, folders, permissions |
| `onedrive.adapter.ts`     | Microsoft OneDrive   | OAuth2 (MSAL)              | files, folders              |
| `sharepoint.adapter.ts`   | Microsoft SharePoint | OAuth2 (MSAL)              | sites, lists, documents     |
| `figma.adapter.ts`        | Figma                | OAuth2 or personal token   | files, components, comments |
| `bitbucket.adapter.ts`    | Atlassian Bitbucket  | OAuth2                     | repos, PRs, pipelines       |
| `clickup.adapter.ts`      | ClickUp              | OAuth2 or API key          | tasks, lists, spaces        |
