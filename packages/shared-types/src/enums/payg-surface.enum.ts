/**
 * Which product surface spent a user's PAYG credit.
 *
 * Recorded on every ledger row because "where did my $5 go" is otherwise
 * unanswerable, and an unanswerable spend question becomes a support ticket and
 * then a chargeback. The billing page renders this directly.
 *
 * One member per place that can reach a paid provider. Adding a new surface
 * without adding a member here is what lets spend become anonymous again, so
 * `rules/37-payg-credit-integrity.md` requires the two to change together.
 */
export enum PaygSurface {
  /** Ordinary chat, including regenerate and edit-resend. */
  CHAT = 'CHAT',
  /** Compare mode — one row per lane, not one per run. */
  COMPARE = 'COMPARE',
  /** The judge / critic second pass over a compare run. */
  JUDGE = 'JUDGE',
  /** The nine advanced orchestration labs. `workflow` narrows which one. */
  ORCHESTRATION = 'ORCHESTRATION',
  /** Image generation, including each attempt of an auto-fallback chain. */
  IMAGE = 'IMAGE',
  /** Document/file content generation. */
  FILE_GENERATION = 'FILE_GENERATION',
  /** The runtime-v2 agent loop behind the coding agent. One row per turn. */
  CODING_AGENT = 'CODING_AGENT',
  /** Workspace AI actions, multi-model review, chain drafting, handoff. */
  WORKSPACE_ACTION = 'WORKSPACE_ACTION',
  /** Router-initiated inference triggered by a message event. */
  ROUTING = 'ROUTING',
  /**
   * Speech-to-text of an uploaded audio file or voice note (file-service).
   * One row per PROVIDER ATTEMPT: a fall-through to a second provider is a
   * second paid call. Priced per second of input audio on a per-unit row
   * (`audioPerUnitMicroUsd`, OpenAI whisper-1) or per token (Gemini).
   */
  TRANSCRIPTION = 'TRANSCRIPTION',
  /**
   * The helper vision model that describes an attached image for a chat lane
   * whose model cannot see (chat-service, ADR-120 batch 5). One row per
   * (turn, image, candidate attempt): compare lanes and the judge in the same
   * turn reuse one description, so one image is one paid call.
   */
  VISION_HELPER = 'VISION_HELPER',
  /**
   * Text-to-speech of an assistant reply ("Read aloud", chat-service,
   * multimodal batch 9). One row per PROVIDER ATTEMPT. Priced per character
   * synthesised on a per-unit row (`ttsPerCharacterMicroUsd`, OpenAI tts-1)
   * or per token (Gemini TTS). Never mixed with TRANSCRIPTION: speech out and
   * speech in are different products with different prices.
   */
  TTS = 'TTS',
}

// Deliberately NOT a member: RESEARCH. Research enrichment reaches search SaaS
// (Brave, Exa, Tavily, ...), never a paid model, and is metered separately
// through FeatureUsageRecord's WEB_SEARCH / WEB_FETCH / WEB_EXTRACT allowances.
// A member with no producer is worse than an absent one - it makes the enum
// claim a spend path the system does not actually attribute, and it defeats the
// exhaustiveness test that stops a NEW paid surface from shipping anonymously.
