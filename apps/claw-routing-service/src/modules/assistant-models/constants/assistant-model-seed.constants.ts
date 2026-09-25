import { AssistantModelRole, RouterProvider } from '../../../generated/prisma';
import type { AssistantModelSeedEntry } from '../types/assistant-model.types';

export const ASSISTANT_MODEL_SEED_NAME = 'assistant-models-default';
export const ASSISTANT_MODEL_SEED_VERSION = 1;
/** Distinct from the chain seed's lock so the two never serialise on each other. */
export const ASSISTANT_MODEL_SEED_LOCK_ID = 740_040_003;

/**
 * The default research-gate candidates.
 *
 * Every alias here names a model the catalog actually holds. That is not a
 * detail: an alias resolves to a deployment exactly or not at all, and the
 * router chain shipped for a month naming three models that did not exist,
 * each silently skipped on every request.
 *
 * Ordered and CLOUD-FIRST because the gate fails closed. A gate that cannot
 * reach a model answers "this turn does not need the web", so a local-only
 * default on a production box that runs no local Ollama does not fail loudly —
 * it just quietly turns the feature off and looks implemented.
 *
 * Seeded once. Afterwards it is the admin page's to change, which is the point:
 * choosing the model is an operator decision, not a redeploy.
 */
export const ASSISTANT_MODEL_SEED_ENTRIES: readonly AssistantModelSeedEntry[] = Object.freeze([
  {
    role: AssistantModelRole.RESEARCH_GATE,
    order: 1,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'gpt-oss:20b',
    timeoutMs: 6_000,
    maxTokens: 64,
  },
  {
    role: AssistantModelRole.RESEARCH_GATE,
    order: 2,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'glm-5.2',
    timeoutMs: 6_000,
    maxTokens: 64,
  },
  {
    // Last, and local: right on a laptop, absent in production. It answers when
    // nothing else is reachable rather than being the first thing tried.
    role: AssistantModelRole.RESEARCH_GATE,
    order: 3,
    provider: RouterProvider.OLLAMA,
    modelAlias: 'qwen3:1.7b',
    timeoutMs: 6_000,
    maxTokens: 64,
  },
  // FILE_WRITER: writes the content of an AI-generated file. These used to
  // be hard-coded (claude-sonnet-4, gpt-4o-mini, gemini-2.5-flash), and when
  // none of them was exposed every file request failed with "The selected
  // model is not available". Hosted Ollama models that production's catalog
  // holds; a large output budget because a file is a whole document.
  //
  // The order is what the F4 matrix measured over 1,500 real files
  // (docs/09-testing/file-model-matrix.md, ADR-111): gemma4:31b and
  // qwen3.5:397b and glm-5.1 each wrote 100/100, and gemma4:31b was the
  // fastest (3.1 s median). It replaced gpt-oss:120b (94/100) first and
  // glm-5.3, which is not exposed and so could never run as a fallback.
  {
    role: AssistantModelRole.FILE_WRITER,
    order: 1,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'gemma4:31b',
    timeoutMs: 120_000,
    maxTokens: 8_192,
  },
  {
    role: AssistantModelRole.FILE_WRITER,
    order: 2,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'qwen3.5:397b',
    timeoutMs: 120_000,
    maxTokens: 8_192,
  },
  {
    role: AssistantModelRole.FILE_WRITER,
    order: 3,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'glm-5.1',
    timeoutMs: 120_000,
    maxTokens: 8_192,
  },
  // VISION_HELPER: describes an attached image for a lane whose model cannot
  // see (ADR-120, multimodal batch 5). chat-service only tries a candidate the
  // connector catalog marks vision-SUPPORTED, so a provider the install has not
  // configured is skipped rather than failing the turn. Gemini first because it
  // is the connector a typical install actually has; OpenAI second. A bounded
  // budget: observations are a description, not an answer.
  {
    role: AssistantModelRole.VISION_HELPER,
    order: 1,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-2.5-flash',
    timeoutMs: 30_000,
    maxTokens: 1_024,
  },
  {
    role: AssistantModelRole.VISION_HELPER,
    order: 2,
    provider: RouterProvider.OPENAI,
    modelAlias: 'gpt-4.1-mini',
    timeoutMs: 30_000,
    maxTokens: 1_024,
  },
  // TTS_VOICE: reads an assistant reply aloud (multimodal batch 9). Gemini
  // first because it is the connector a typical install has; its TTS model
  // is token-priced and returns 24 kHz PCM that chat-service wraps in WAV.
  // OpenAI `tts-1` second: priced per CHARACTER (ttsPerCharacterMicroUsd), so
  // the meter settles exactly on what was sent — gpt-4o-mini-tts is not
  // seeded because its response reports no usage to settle tokens on.
  // maxTokens is the Gemini audio-output ceiling: 4 tokens per character
  // covers the 4,000-character cap with room (unused by tts-1).
  {
    role: AssistantModelRole.TTS_VOICE,
    order: 1,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-2.5-flash-preview-tts',
    timeoutMs: 60_000,
    maxTokens: 16_384,
  },
  {
    role: AssistantModelRole.TTS_VOICE,
    order: 2,
    provider: RouterProvider.OPENAI,
    modelAlias: 'tts-1',
    timeoutMs: 60_000,
    maxTokens: 16_384,
  },
]);
