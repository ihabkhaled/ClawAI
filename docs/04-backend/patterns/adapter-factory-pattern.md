# Pattern: Adapter Factory

> Used in claw-connector-service, claw-image-service, claw-file-generation-service, claw-ollama-service, claw-research-service, claw-workspace-service.

## Problem

Multiple providers (OpenAI, Anthropic, Gemini, etc.) implement the same operations (health check, model sync) but with different APIs, auth methods, and response shapes. The calling code (manager/service) shouldn't need to know which provider it's talking to.

## Solution: Provider-specific adapters behind a common interface, resolved at runtime by a factory.

```typescript
// 1. Define the interface (in types/ file)
interface ProviderAdapter {
  healthCheck(config: ConnectorConfig): Promise<HealthCheckResult>;
  syncModels(config: ConnectorConfig): Promise<NormalizedModel[]>;
  getCapabilities(): ProviderCapabilities;
}

// 2. Implement per provider (all Injectable)
@Injectable()
class OpenAIAdapter implements ProviderAdapter { ... }

@Injectable()
class OllamaAdapter implements ProviderAdapter { ... }

// 3. Factory resolves by enum
@Injectable()
class AdapterFactory {
  constructor(
    private readonly openai: OpenAIAdapter,
    private readonly ollama: OllamaAdapter,
    // ...
  ) {}

  getAdapter(provider: ConnectorProvider): ProviderAdapter {
    switch (provider) {
      case ConnectorProvider.OPENAI: return this.openai;
      case ConnectorProvider.OLLAMA: return this.ollama;
      // Never use default — exhaustive switch catches new providers at compile time
    }
  }
}

// 4. Register all in module
@Module({
  providers: [AdapterFactory, OpenAIAdapter, OllamaAdapter],
  exports: [AdapterFactory],
})
```

## Rules

1. Adapters are `@Injectable()` — never instantiate with `new`
2. All adapters registered in the feature module's `providers` array
3. Factory injected into the manager (not the service)
4. Use exhaustive switch — no `default` case — TypeScript catches unhandled providers
5. Each adapter must implement ALL methods of the interface (no optional methods)
6. Adapters never import from controllers or services — they are leaf nodes

## Where Used

| Service                      | Factory                        | Interface                   | Adapters                                                       |
| ---------------------------- | ------------------------------ | --------------------------- | -------------------------------------------------------------- |
| claw-connector-service       | `AdapterFactory`               | `ProviderAdapter`           | 7 (OpenAI, Anthropic, Gemini, Bedrock, DeepSeek, Ollama, Grok) |
| claw-image-service           | `ImageAdapterFactory`          | `ImageGenerationAdapter`    | 3 (DALL-E, Gemini, SD)                                         |
| claw-file-generation-service | `FileFormatAdapterFactory`     | `FileGenerationAdapter`     | 7 (PDF, DOCX, CSV, HTML, MD, JSON, TXT)                        |
| claw-ollama-service          | `RuntimeAdapterFactory`        | `RuntimeAdapter`            | 5 (Ollama, ComfyUI, llama.cpp, LocalAI, vLLM)                  |
| claw-research-service        | `SearchProviderAdapterFactory` | `SearchProviderAdapter`     | 4 (Tavily, SearXNG, Ollama Web, HTTP Fetch)                    |
| claw-workspace-service       | `WorkspaceAdapterFactory`      | `WorkspaceConnectorAdapter` | 12 (GitHub, GitLab, Jira, etc.)                                |
