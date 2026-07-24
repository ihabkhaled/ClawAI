export function LocalFirstSection(): React.ReactElement {
  return (
    <section id="local-first" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Local-first, cloud-optional
        </h2>
        <p className="text-muted-foreground mt-4">
          ClawAI runs an Ollama-based local AI runtime out of the box, so a working chat experience
          is available on your own hardware without any external API keys. Local models handle
          routing decisions, memory extraction, and everyday chat by default, and can be assigned
          specialized roles &mdash; coding, reasoning, file generation, or agentic
          &ldquo;thinking&rdquo; tasks &mdash; from a built-in catalog of curated open models
          spanning routing-sized models up to large general-purpose and reasoning models.
        </p>
        <p className="text-muted-foreground mt-4">
          Cloud providers are entirely optional. When you connect OpenAI, Anthropic, Gemini, AWS
          Bedrock, DeepSeek, or Grok, ClawAI treats them as additional routing targets rather than a
          replacement for the local runtime &mdash; you choose per thread, per message, or let the
          router decide, and you can run with no cloud connectors configured at all if that is what
          your deployment requires.
        </p>
      </div>
    </section>
  );
}
