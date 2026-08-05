/**
 * Deterministic behavioural probe for native tool calling (§9.2 step 6).
 *
 * This is what upgrades a capability record from ADVERTISED to PROVEN. The
 * curated family list in ollama-tool-heuristics.constants.ts is a claim; this
 * is a demonstration — it asks a model to call a tool and checks whether it
 * actually emitted `message.tool_calls`.
 *
 * The distinction is the whole point of §9: "never route Agent work from a
 * hard-coded model-name guess". A model whose family says it has tools but
 * which silently ignores the field produces an agent run that cannot call
 * anything and cannot explain why. Only a probe catches that.
 */

/** Stable identifier recorded on the ModelBehaviorProbeResult. */
export const OLLAMA_TOOL_PROBE_ID = 'native-tool-call';

/**
 * A trivial tool the model has no plausible reason to refuse and no way to
 * answer without calling. Deliberately NOT a workspace tool: the probe must
 * measure the model's tool-calling mechanics, not its willingness to touch a
 * filesystem, and it must be safe to run against any model on any connector.
 */
export const OLLAMA_TOOL_PROBE_TOOL = {
  type: 'function',
  function: {
    name: 'get_current_temperature',
    description: 'Return the current temperature for a city. Must be called to answer.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name' },
      },
      required: ['city'],
      additionalProperties: false,
    },
  },
} as const;

export const OLLAMA_TOOL_PROBE_PROMPT =
  'What is the current temperature in Paris? You must use the provided tool to answer.';

/**
 * Temperature 0 and a tiny output cap. The probe is a yes/no mechanical check,
 * so sampling variance is noise and a long completion is wasted spend — a
 * model that is going to emit a tool call emits it immediately.
 */
export const OLLAMA_TOOL_PROBE_OPTIONS = { temperature: 0, num_predict: 64 } as const;

/**
 * Short by design. A probe that hangs is itself a failure signal, and a slow
 * one must never block whatever asked for it.
 */
export const OLLAMA_TOOL_PROBE_TIMEOUT_MS = 30_000;

/** Stable failure codes — never a raw provider body. */
export const OLLAMA_TOOL_PROBE_FAILURE_NO_CALL = 'PROBE_NO_TOOL_CALL';
export const OLLAMA_TOOL_PROBE_FAILURE_REQUEST = 'PROBE_REQUEST_FAILED';
export const OLLAMA_TOOL_PROBE_FAILURE_WRONG_TOOL = 'PROBE_WRONG_TOOL_NAME';

/**
 * How long a probe result stays authoritative. A model can change underneath a
 * tag — a re-pull, a server upgrade — so evidence expires rather than being
 * trusted forever.
 */
export const OLLAMA_TOOL_PROBE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

/**
 * Reported when the selected provider has no probe implementation at all.
 *
 * Deliberately a FAILED result rather than a pass: an unprobed model must
 * never look proven. "We cannot check this" and "we checked and it works" are
 * different claims, and only one of them justifies routing an agent run.
 */
export const CAPABILITY_PROBE_UNSUPPORTED_ID = 'probe-unsupported';
export const CAPABILITY_PROBE_UNSUPPORTED_CODE = 'PROBE_NOT_IMPLEMENTED_FOR_PROVIDER';
