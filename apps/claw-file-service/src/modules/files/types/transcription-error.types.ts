/**
 * The parts of a thrown axios error that say why a transcription provider
 * refused. Mirrors `claw-image-service`'s `ProviderErrorShape` — same axios
 * error shape, same reason for declaring it rather than reading off
 * `unknown` with casts: `error.message` is a nested object for Gemini and
 * OpenAI, never usable directly. Declared locally instead of shared because a
 * @claw/shared-* edit marks every one of the 18 services "affected" for the
 * pre-commit gate — not worth it for a two-field read model each service
 * already has its own copy of.
 */
export type TranscriptionProviderErrorBody = {
  /**
   * `code`/`type` carry OpenAI's `insufficient_quota`; Gemini puts a number in
   * `code` and `RESOURCE_EXHAUSTED` in `status`.
   */
  error?: { message?: string; code?: string | number; type?: string; status?: string } | string;
  message?: string;
};

export type ProviderErrorShape = {
  code?: string;
  response?: {
    status?: number;
    data?: TranscriptionProviderErrorBody;
  };
};
