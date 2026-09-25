# 56 — A model's reasoning never reaches the answer

**Status:** active · **Owner:** chat-service · **Added:** 2026-09-25

**Applies to**: every path in `apps/claw-chat-service` that turns a provider
response into `LlmResponse.content` — streamed, buffered, or buffered and
replayed through `ProviderStreamExecutor.runSimulated`.

**Related**: [rules/42](42-attachment-understanding.md) (the voice-note turn
this was found on) · [rules/54](54-evidence-and-completion-honesty.md).

## The rule

1. **Reasoning goes to `LlmResponse.reasoning`, never to `content`.** It is
   stored as `metadata.reasoning` and shown in the "Model reasoning" panel.
   The answer is what the user asked for; the model's private notes about the
   user ("I already told them. Be concise.") are not.
2. **Every reasoning channel is read**, not just `<think>…</think>`:
   - a separate field — Ollama `message.thinking`, OpenAI-compatible
     `reasoning_content` / `reasoning`;
   - an inline block — `<think>`, `<thinking>`, `<reasoning>`, `<thought>`,
     any case, including an unterminated one at the end;
   - **a bare closing tag with no opening tag.** GLM (and any chat template
     that injects `<think>` into the prompt) starts its output INSIDE the
     reasoning, so the only tag in the text is `</think>`. Everything before
     it is reasoning.
3. **A buffered response is split once, at the parser, before anything else
   sees it.** `splitBufferedReasoning`
   (`chat-messages/utilities/buffered-reasoning.utility.ts`) is that split;
   `parseOllamaChatResponse` applies it and the simulated replay receives the
   clean `fullContent` plus `reasoningContent`. Splitting only inside the
   replay scanner fixes the live preview and still stores the leak.
4. **Content with no tag is returned byte-for-byte.** A closing tag quoted in
   inline code (`` `</think>` ``) is text, not a delimiter.

## Why

Prod 2026-09-25, OLLAMA / `glm-5.3`, Direct mode. The stored answer was
`"…I still can't transcribe it. Be concise.</think>Same voice note, same
problem: …"`. The streaming `ThinkingFragmentScanner` looks only for an
OPENING tag while outside a block, and the Ollama Cloud path stored the raw
buffered content anyway. The markdown renderer dropped the unknown `</think>`
element, so the user read the model's notes about them run straight into the
reply.

## How this is enforced

| Item | Mechanism                                                                                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2, 4 | `utilities/__tests__/buffered-reasoning.utility.spec.ts` — the captured prod payload, every tag spelling, unterminated tag, empty block, quoted tag, reasoning-only                                                         |
| 1, 3 | `__tests__/chat-execution-native-tools.manager.spec.ts` "Ollama Cloud reasoning never reaches the answer" — prod payload and `message.thinking` through `callProvider`                                                      |
| 3    | `__tests__/chat-execution.manager.spec.ts` "replays GLM reasoning to the reasoning panel and stores a clean answer" — `runSimulated` gets clean `fullContent` + `reasoningContent`, the returned `LlmResponse` carries both |

## Known gap

The live SSE scanner (`ThinkingFragmentScanner`) still cannot recognise a
bare `</think>` on a TRUE stream: by the time the closing tag arrives the text
before it has already been emitted as content. Every Ollama Cloud chat is a
buffered replay today, so this rule's fix covers it; a provider that streams
GLM over OpenAI-compatible SSE would need the scanner to hold content back
until it has seen either an opening tag or enough text to rule a closing one
out.
