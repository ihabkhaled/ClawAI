/**
 * Non-token quantities one execution is billed on, each priced per unit by its
 * own `ModelCostRates` column. Absent means zero.
 *
 * - `imageUnits`    × `imagePerUnitMicroUsd`    — one generated image
 * - `audioSeconds`  × `audioPerUnitMicroUsd`    — one SECOND of input audio
 * - `ttsCharacters` × `ttsPerCharacterMicroUsd` — one character synthesised
 *
 * Counted by the ORCHESTRATOR, never read off the provider: an image, speech or
 * transcription endpoint typically reports no token usage at all, so these are
 * the only signal that the call cost anything.
 */
export type BillableUnitCounts = {
  imageUnits?: number;
  audioSeconds?: number;
  ttsCharacters?: number;
};

/**
 * Per-unit billable calls a single execution made, alongside its token counts.
 *
 * Kept separate from {@link RawTokenBreakdown} at the call site because tool and
 * search calls are counted by the ORCHESTRATOR (it knows how many tools it ran),
 * while tokens come from the PROVIDER. Merging them into one argument invites a
 * caller to pass the provider's response for both and silently bill zero tools.
 */
export type BillableCallCounts = BillableUnitCounts & {
  toolCalls?: number;
  searchCalls?: number;
};
