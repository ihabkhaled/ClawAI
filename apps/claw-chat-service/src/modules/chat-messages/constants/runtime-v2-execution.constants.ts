import { RUNTIME_V2_MAX_OUTPUT_TOKENS } from './runtime-v2-transcript.constants';

import type { ExecutionOptions } from '../types/execution-options.types';

// How one agent turn is executed.
//
// The runtime lane used to pass nothing here, which is not the same as passing
// no cap: the Ollama connector builder computes a defensive default whenever
// the caller is silent, and that default was written for single-shot chat. It
// reserves `ctx - prompt - 256` tokens for the answer, so an agent turn asked
// for roughly 26,000 tokens of output and left the prompt nowhere to sit.
//
// Neither of the other two switches belongs on an agent turn. The fast path is
// an AUTO-routing shortcut, and the short-response constraint appends an
// instruction to keep the answer brief — which is the opposite of what a turn
// that has to emit a file's contents needs.
export const RUNTIME_V2_TURN_EXECUTION_OPTIONS: ExecutionOptions = {
  fastPathEnabled: false,
  applyShortResponseConstraint: false,
  maxOutputTokens: RUNTIME_V2_MAX_OUTPUT_TOKENS,
};
