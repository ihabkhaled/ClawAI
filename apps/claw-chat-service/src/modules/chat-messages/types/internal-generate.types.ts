import type { PaygSurface } from '@claw/shared-types';

export type InternalGenerateRequest = {
  /** Who the provider call is billed to. Required: an unattributable paid call is refused. */
  userId: string;
  /** Which product surface spent the credit, so "where did my $5 go" stays answerable. */
  surface: PaygSurface;
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  /** Narrows the surface to the specific action, e.g. the workspace AI action name. */
  workflow?: string;
};

export type InternalGenerateResponse = {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  /**
   * True when the output ceiling was cut down to fit the caller's remaining
   * pay-as-you-go credit.
   *
   * Returned so the calling service can tell its own user the answer was
   * shortened by their balance rather than by the model. A silently short
   * answer is the failure this field exists to prevent.
   */
  clamped: boolean;
};
