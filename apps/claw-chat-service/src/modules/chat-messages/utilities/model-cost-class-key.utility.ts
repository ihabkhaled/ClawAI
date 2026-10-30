// One key for a model's cost class, shared by the send gate's cache and the picker lookup.
//
// A model id can itself contain "/" (`vendor/model` on an aggregator), so joining provider and model
// with "/" is ambiguous: provider `OPENROUTER/vendor` + model `x` would collide with provider
// `OPENROUTER` + model `vendor/x`. A JSON pair cannot collide.
export function costClassKey(provider: string, model: string): string {
  return JSON.stringify([provider, model]);
}
