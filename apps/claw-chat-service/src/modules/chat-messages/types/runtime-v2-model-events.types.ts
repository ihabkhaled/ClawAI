/**
 * One journal event carrying part of a model turn's output.
 *
 * The payload shapes are fixed by the protocol clients validate against:
 * `model.turn.started` carries only the turn, `model.delta` carries text, and
 * `model.summary` carries a non-empty summary. Each is strict, so an extra key
 * is a rejected event rather than an ignored one.
 */
export type RuntimeV2ModelEventDraft =
  | { readonly type: 'model.turn.started'; readonly payload: { readonly turnId: string } }
  | {
      readonly type: 'model.delta';
      readonly payload: { readonly turnId: string; readonly text: string };
    }
  | {
      readonly type: 'model.summary';
      readonly payload: { readonly turnId: string; readonly summary: string };
    };
