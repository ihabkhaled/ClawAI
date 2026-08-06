import type { RuntimeV2ModelOutput } from './runtime-v2-model-output.types';
import type { LlmResponse } from './execution.types';

/** One model turn: the provider response and what the runtime made of it. */
export interface RuntimeV2ModelTurn {
  readonly response: LlmResponse;
  readonly output: RuntimeV2ModelOutput;
}
