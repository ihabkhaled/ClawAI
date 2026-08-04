// Wire dialect a provider speaks for native tool calling. The three real
// dialects differ in three ways that matter and are easy to get silently
// wrong: where the JSON Schema hangs (`function.parameters` vs `input_schema`),
// whether tool-call arguments arrive as a JSON *string* or an object, and what
// shape a tool *result* message takes. NONE means the provider has no native
// tool surface, so the caller must fall back to the prompt-JSON lane.
export enum ProviderToolDialect {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  OLLAMA = 'OLLAMA',
  NONE = 'NONE',
}
