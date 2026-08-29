/**
 * Per-unit billable calls a single execution made, alongside its token counts.
 *
 * Kept separate from {@link RawTokenBreakdown} at the call site because tool and
 * search calls are counted by the ORCHESTRATOR (it knows how many tools it ran),
 * while tokens come from the PROVIDER. Merging them into one argument invites a
 * caller to pass the provider's response for both and silently bill zero tools.
 */
export type BillableCallCounts = {
  toolCalls?: number;
  searchCalls?: number;
  /**
   * Images produced. Counted by the orchestrator, never by the provider — an
   * image endpoint reports no usage of any kind, so this is the only signal
   * that the call cost anything at all.
   */
  imageUnits?: number;
};
