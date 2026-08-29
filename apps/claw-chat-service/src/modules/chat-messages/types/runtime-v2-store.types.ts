import type {
  RuntimeCancelDto,
  RuntimeEpochsDto,
  RuntimeEventDto,
  RuntimeResultDto,
  RuntimeStartDto,
  RuntimeSteeringDto,
  ToolDefinitionDto,
  ToolInvocationDto,
} from '../dto/runtime-v2.dto';

export interface RuntimeV2KeyFamily {
  readonly state: string;
  readonly events: string;
  readonly acknowledgements: string;
  readonly invocations: string;
  readonly results: string;
  readonly steering: string;
  readonly steeringData: string;
}

export interface RuntimeV2TaggedReply {
  readonly tag: string;
  readonly body: string;
}

export interface RuntimeV2StartInput {
  readonly ownerId: string;
  readonly messageId: string;
  readonly request: RuntimeStartDto;
  readonly ttlSeconds: number;
}

export interface RuntimeV2StartAck {
  readonly runId: string;
  readonly generation: string;
  readonly messageId: string;
  readonly sequence: number;
  readonly replayed: boolean;
}

export interface RuntimeV2BoundInput {
  readonly ownerId: string;
  readonly threadId: string;
  readonly messageId: string;
  readonly clientRequestId: string;
  readonly startIdempotencyKey: string;
  readonly runId: string;
  readonly generation: string;
  readonly epochs: RuntimeEpochsDto;
  readonly manifestHash: string;
  readonly toolCatalogHash: string;
  readonly toolDefinitions: readonly ToolDefinitionDto[];
  readonly provider: string;
  readonly model: string;
  readonly claimId?: string;
  readonly ttlSeconds: number;
}

export interface RuntimeV2InvocationInput extends RuntimeV2BoundInput {
  readonly invocation: ToolInvocationDto;
}

export interface RuntimeV2ResultInput extends RuntimeV2BoundInput {
  readonly command: RuntimeResultDto;
}

export interface RuntimeV2SteeringInput extends RuntimeV2BoundInput {
  readonly command: RuntimeSteeringDto;
}

export interface RuntimeV2CancelInput extends RuntimeV2BoundInput {
  readonly command: RuntimeCancelDto;
}

export interface RuntimeV2ClaimInput extends RuntimeV2BoundInput {
  readonly messageId: string;
  readonly provider: string;
  readonly model: string;
  readonly deliveryId: string;
}

/**
 * Why a run ended, carried on the terminal event.
 *
 * A failed run used to emit `run.failed` with an empty payload, so the client
 * could show that the run died but never why. Both fields are bounded and the
 * event is already marked sensitive-redacted.
 */
export interface RuntimeV2TerminalReason {
  readonly code: string;
  readonly message: string;
}

export interface RuntimeV2TerminalInput extends RuntimeV2BoundInput {
  readonly claimId: string;
  readonly idempotencyKey: string;
  /**
   * How the run ended.
   *
   * `paused` exists for one reason: pay-as-you-go credit running out mid-run
   * (edge case E6). A coding-agent run that dies as `failed` discards the whole
   * point of the run - the transcript, the admitted tools, the edits already
   * made - and the user has to start over after topping up, paying twice for
   * the same work. `paused` writes the same terminal event through the same
   * script, so the journal, the tool receipts and the context all survive under
   * the run's TTL and the client can tell "add credit and pick this up" apart
   * from "this run is dead".
   */
  readonly status: 'completed' | 'failed' | 'paused';
  readonly completedAt: string;
  readonly reason?: RuntimeV2TerminalReason;
}

/**
 * The model's own output for one turn, as journal events.
 *
 * Runtime V2 streamed lifecycle and tool events only, so a client watching the
 * stream saw a run start, dispatch, call tools and complete while the
 * assistant's actual answer went to the database and nowhere else. The protocol
 * already defines `model.turn.started`, `model.delta` and `model.summary`, and
 * clients already project them — the server simply never emitted any of them.
 */
export interface RuntimeV2ModelOutputInput extends RuntimeV2BoundInput {
  readonly claimId: string;
  readonly idempotencyKey: string;
  readonly turnId: string;
  readonly text: string;
}

export interface RuntimeV2DispatchInput extends RuntimeV2BoundInput {
  readonly claimId: string;
  readonly idempotencyKey: string;
  readonly dispatchedAt: string;
}

export interface RuntimeV2ReadInput extends RuntimeV2BoundInput {
  readonly after: number;
}

export interface RuntimeV2MutationAck {
  readonly runId: string;
  readonly sequence: number;
  readonly eventId: string;
  readonly replayed: boolean;
}

export interface RuntimeV2MutationDraft {
  readonly runId: string;
  readonly sequence: number;
  readonly eventId: string;
}

export interface RuntimeV2ClaimAck extends RuntimeV2MutationAck {
  readonly claimId: string;
  readonly claimed: boolean;
}

export interface RuntimeV2ReadAck {
  readonly runId: string;
  readonly events: readonly RuntimeEventDto[];
  readonly terminal: boolean;
}

export interface RuntimeV2BindingLookup {
  readonly ownerId: string;
  readonly threadId: string;
  readonly runId: string;
  readonly generation: string;
  readonly ttlSeconds: number;
}

export interface RuntimeV2MessageBindingLookup {
  readonly messageId: string;
  readonly threadId: string;
  readonly provider: string;
  readonly model: string;
  readonly ttlSeconds: number;
}
