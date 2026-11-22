# ADR-219: Large text is an attachment, fitted by relevance

**Status:** Accepted

**Date:** 2026-11-22

Builds on [ADR-127](adr-127-memory-and-packs-stored-whole-retrieved-by-relevance.md). Rules: [rule 42](../../rules/42-attachment-understanding.md), [rule 51](../../rules/51-router-candidates-and-model-window-fit.md).

## Context

The owner pasted a very large text into the composer and it was cut (the message schema stops at 100,000 characters; several multi-model surfaces at 10,000). Attaching the same brief as a ~60 KB `.txt` showed "Truncated — the text was too long and was shortened" on `OLLAMA/kimi-k3.1-pro`. Cause: 163 of 180 production catalog models have no context window, so chat-service budgets them at 32,768 tokens; files get a quarter of that (~24,000 characters) and `fitTextsToBudget` kept only each file's head. The owner wants millions of characters to work.

## Decision

1. **A big paste becomes a text attachment.** Above a threshold the composer turns pasted text into a `Pasted text N.txt` attachment through the normal upload path, shown as a chip; short text stays inline. Inline caps are the same on every chat surface.
2. **A file is delivered whole when it fits; otherwise by relevance.** An over-budget file is chunked and the passages most relevant to the question are kept (the existing relevance ranker used for memories and packs), always with the document's opening. The model is told how much of the file it sees, so it never claims to have read all of it.
3. **Extraction keeps multi-million-character text** (file-service extraction cap raised).
4. **Windows come from the provider, never guessed.** connector-service asks Ollama `POST /api/show` for any model its table does not cover (`<arch>.context_length`; live 2026-11-22: `kimi-k3.1-pro` = 1,048,576), bounded (4 at a time, 5 s each, 100 per sync, 30 s total, cached 24 h); preset lists now also read `max_context_length`, `max_model_len` and Cloudflare's `context_window` property. Still-unknown windows keep the conservative default and relevance fitting.

## Consequences

- A paste of any size reaches the model as an attachment; the composer stays responsive.
- An unknown-window model sees the right parts of a large file instead of its first pages.
- chat-service still fetches each attached file's raw bytes with its extracted text every turn (up to ~2x the file size per turn at the 50 MB upload cap). Open: fetch text files with `includeContent=false`.
- Providers whose list API carries no window (OpenAI, Anthropic, DeepSeek, Grok, Bedrock, Cerebras, Qwen, ZAI, Perplexity) rely on the shared `KNOWN_CONTEXT_WINDOWS` table.
