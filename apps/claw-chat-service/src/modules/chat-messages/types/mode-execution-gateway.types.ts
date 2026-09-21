import { type TokenLedgerContext } from '@claw/shared-types';

import { type ChatContextBundle } from './chat-context-gateway.types';
import { type ExecutionOptions } from './execution-options.types';
import { type PaygCallOptions } from './payg.types';

/**
 * One call to one model, on behalf of an orchestration mode.
 *
 * The modes used to build an `OllamaGenerateRequest` by hand and post it to
 * `/api/v1/ollama/generate`, which pinned every lab run to whatever local model
 * happened to be installed. A user with only a Gemini connector could not run
 * Best-of-N at all, and no lab run could ever use the model the router would
 * have chosen.
 */
export type ModeExecutionRequest = {
  /** The context this run must see, from `ChatContextGatewayManager`. */
  bundle: ChatContextBundle;

  /**
   * What to ask, when it is not already the last message in the bundle.
   *
   * A decomposed sub-task, a pipeline stage's input or a verifier's question
   * is not a message anyone typed. It is APPENDED as a user turn rather than
   * replacing the conversation, so the model still sees what came before.
   */
  prompt?: string;

  provider: string;
  model: string;

  /** Which column of the token ledger this call belongs to. */
  ledgerContext: TokenLedgerContext;

  /** Identifies the hold, so a lane can be traced through billing. */
  paygCall?: PaygCallOptions;

  routingMode?: string;
  executionOptions?: ExecutionOptions;
};
