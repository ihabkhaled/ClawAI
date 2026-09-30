// Codes the provider layer raises when a native tool call cannot be mapped back
// onto the admitted catalog. They are the model's mistake, so the Runtime V2
// loop answers them with a repair turn rather than ending the run.
export const NATIVE_TOOL_CALL_REJECTION_CODES = [
  'MODEL_TOOL_UNKNOWN',
  'MODEL_TOOL_ARGUMENT_INVALID',
] as const;
