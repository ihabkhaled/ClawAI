# Chat Routing and Quality Controls Design

## Scope

This change delivers three independent improvements:

1. Keep PayPal wallet and card controls fully hidden beneath an opaque loader until both SDK renders finish.
2. Prevent AUTO chat routing from selecting unreachable providers or non-text generation models for ordinary text prompts.
3. Move Judge, Critic, quality threshold, and reroute-attempt controls out of Thread Settings into one focused panel opened from the chat header beside Compare Models.

## Checkout loading behavior

The PayPal SDK renders provider-owned iframe descendants. The loading state therefore hides the complete SDK container with group opacity, disables pointer interaction, and marks it hidden from assistive technology. An opaque white loader surface sits above it. The controls become visible only after both eligible PayPal wallet and card renders resolve.

## AUTO routing behavior

AUTO routing must never make a best-effort request to a provider that current health data explicitly marks unreachable. When the configured local Ollama router cannot run, deterministic fallback selects a healthy text-capable provider from the established cloud priority list. Image and file providers remain available only when the prompt explicitly requests those capabilities.

If no local runtime or text connector is reachable, routing must return a truthful unavailable decision that prevents execution, rather than fabricating a provider/model pair that will fail during generation. Existing fallback chains contain only healthy, capability-compatible entries.

The current semantic guard remains defense in depth and receives a plain-greeting regression case so an Ollama router response cannot reinterpret ordinary chat as image generation.

## Judge & Critic panel

One combined Judge & Critic button appears immediately after Compare Models when the user has either relevant plan feature. It toggles a focused card beneath the header. The card contains:

- Judge enablement and judge model selection.
- Critic enablement and critic model selection, gated by Judge and the critic plan feature.
- Quality threshold.
- Maximum reroute attempts.
- The existing Save action and validation state.

Thread Settings retains the preferred model, system prompt, temperature, max tokens, context packs, memory, and context toggles. It no longer renders quality-workflow controls.

The existing `useThreadSettings` hook remains the single owner of draft and persisted values. The shell only controls which panel is open, and both panels use the same save callback. Opening Judge & Critic closes neither unrelated dialogs nor mutates settings.

## Error handling and accessibility

- The quality panel is omitted when neither Judge nor Critic is allowed by the plan.
- Critic remains disabled without an eligible concrete critic model.
- Existing max-token validation continues to govern Thread Settings; quality controls use their existing numeric bounds.
- Header buttons keep icon-only mobile labels through `aria-label` and visible desktop labels.
- Expanded-state attributes identify the active header panel.

## Tests

- Checkout test holds both SDK render promises and asserts opacity, interaction, accessibility, loader background, and reveal timing.
- Routing tests cover unhealthy preferred cloud providers, unavailable local routing, no reachable text provider, and a plain greeting rejected from image generation.
- Frontend tests cover header placement/toggling, plan gating, quality-control absence from Thread Settings, panel contents, and persistence wiring.

## Non-goals

- No payment backend changes.
- No database migration or thread schema change.
- No new plan features or permissions.
- No redesign of Compare Models.
