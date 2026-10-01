/**
 * The one journal event that reports a settled cost.
 *
 * `costMicros` is integer micro-USD and is the ONLY key. No provider, model,
 * rate, ceiling or margin may ever be added here: this payload is shown to the
 * user's own client, and the number is allowed there only because a PAYG user is
 * charged exactly that amount (rule 37 item 22).
 */
export type RuntimeV2UsageEventDraft = {
  readonly type: 'run.usage';
  readonly payload: { readonly costMicros: number };
};
