import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { RuntimeV2RedisOperation } from '../../../infrastructure/redis/enums/runtime-v2-redis-operation.enum';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { RuntimeV2RedisPort } from '../../../infrastructure/redis/types/redis-client.types';
import {
  runtimeCancelSchema,
  runtimeEpochsSchema,
  runtimeEventSchema,
  type RuntimeResultDto,
  runtimeResultSchema,
  type RuntimeStartDto,
  runtimeStartSchema,
  runtimeSteeringSchema,
  toolDefinitionSchema,
  toolInvocationSchema,
} from '../dto/runtime-v2.dto';
import type {
  RuntimeV2BindingLookup,
  RuntimeV2BoundInput,
  RuntimeV2CancelInput,
  RuntimeV2ClaimAck,
  RuntimeV2ClaimInput,
  RuntimeV2DispatchInput,
  RuntimeV2InvocationInput,
  RuntimeV2MessageBindingLookup,
  RuntimeV2ModelOutputInput,
  RuntimeV2MutationAck,
  RuntimeV2MutationDraft,
  RuntimeV2ReadAck,
  RuntimeV2ReadInput,
  RuntimeV2ResultInput,
  RuntimeV2StartAck,
  RuntimeV2StartInput,
  RuntimeV2SteeringInput,
  RuntimeV2TerminalInput,
} from '../types/runtime-v2-store.types';
import type { RuntimeV2JsonObject } from '../types/runtime-v2.types';
import {
  createRuntimeV2Identity,
  runtimeV2Sha256,
  runtimeV2TerminalFingerprint,
  stableRuntimeV2Json,
} from '../utilities/runtime-v2-identity.utility';
import { buildRuntimeV2ModelEvents } from '../utilities/runtime-v2-model-events.utility';
import { isAutoRouteSentinel } from '../utilities/runtime-v2-routing.utility';
import {
  runtimeV2ClientRequestKey,
  runtimeV2KeyFamily,
  runtimeV2MessageKey,
  runtimeV2StartKey,
} from '../utilities/runtime-v2-key.utility';
import {
  parseRuntimeV2TaggedReply,
  parseStoredBinding,
  runtimeV2Unavailable,
} from '../utilities/runtime-v2-reply.utility';

const startAckSchema = z
  .object({
    runId: z.string(),
    generation: z.string(),
    messageId: z.string(),
    sequence: z.number().int(),
  })
  .strict();
const mutationAckSchema = z
  .object({ runId: z.string(), sequence: z.number().int(), eventId: z.string() })
  .strict();
const claimAckSchema = mutationAckSchema.extend({ claimId: z.string() }).strict();
const readAckSchema = z
  .object({
    runId: z.string(),
    terminal: z.boolean(),
    events: z.array(z.union([runtimeEventSchema, z.string()])).max(1_000),
  })
  .strict();
const runtimeV2BindingSchema = z
  .object({
    ownerId: z.string().min(1),
    threadId: z.string().min(1),
    messageId: z.string().min(1),
    clientRequestId: z.string().min(1),
    startIdempotencyKey: z.string().min(1),
    runId: z.string().min(1),
    generation: z.string().min(1),
    epochs: runtimeEpochsSchema,
    manifestHash: z.string().min(1),
    toolCatalogHash: z.string().min(1),
    toolDefinitions: z.array(toolDefinitionSchema).min(1),
    provider: z.string().min(1),
    model: z.string().min(1),
    claimId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (runtimeV2Sha256(JSON.stringify(value.toolDefinitions)) !== value.toolCatalogHash) {
      context.addIssue({ code: 'custom', message: 'Stored tool catalog hash mismatch' });
    }
  });

function binding(input: RuntimeV2BoundInput): string {
  return JSON.stringify({
    ownerId: input.ownerId,
    threadId: input.threadId,
    runId: input.runId,
    generation: input.generation,
    messageId: input.messageId,
    clientRequestId: input.clientRequestId,
    epochs: stableRuntimeV2Json(input.epochs),
    manifestHash: input.manifestHash,
    toolCatalogHash: input.toolCatalogHash,
    toolDefinitions: input.toolDefinitions,
    provider: input.provider,
    model: input.model,
    ...(input.claimId === undefined ? {} : { claimId: input.claimId }),
  });
}

function eventJson(
  input: Pick<RuntimeV2BoundInput, 'runId' | 'epochs'>,
  type: string,
  eventId: string,
  payload: RuntimeV2JsonObject,
  correlation?: RuntimeV2JsonObject,
  visibility: 'internal-state' | 'user' = 'user',
): string {
  return JSON.stringify({
    schemaVersion: '2.0',
    runId: input.runId,
    sequence: 0,
    type,
    eventId,
    timestamp: new Date().toISOString(),
    visibility,
    sensitivity: 'sensitive-redacted',
    epochs: input.epochs,
    ...turnBinding(payload),
    payload,
    ...(correlation === undefined ? {} : { correlation }),
  });
}

/**
 * Binds a turn-scoped event to its turn at the top level of the envelope.
 *
 * `turnId` is where clients route and validate a model event; the payload copy
 * alone is not enough. The coding agent rejects any `model.*` event whose
 * top-level turn does not equal the one in its payload, so omitting it made
 * every agent run die on its first `model.turn.started` with a mismatched-turn
 * error, and every later tool call then had no active run to attach to.
 *
 * Deriving the binding from the payload here, rather than at each call site,
 * is what makes the two structurally unable to disagree. Only turn-scoped
 * payloads carry a `turnId` key, so lifecycle and tool events are unaffected.
 */
function turnBinding(payload: RuntimeV2JsonObject): RuntimeV2JsonObject {
  const turnId = payload['turnId'];
  return typeof turnId === 'string' ? { turnId } : {};
}

function assertEpochs(actual: RuntimeV2BoundInput['epochs'], expected: RuntimeV2BoundInput): void {
  if (stableRuntimeV2Json(actual) !== stableRuntimeV2Json(expected.epochs))
    throw new Error('Runtime V2 authoritative epochs do not match the bound run');
}

function canonicalResultOutput(result: RuntimeResultDto['result']): string {
  const output = {
    error: result.error ?? null,
    modelText: result.modelText ?? null,
    structured: result.structured ?? null,
  };
  return stableRuntimeV2Json(output);
}

function verifiedResult(input: RuntimeResultDto['result']): RuntimeV2JsonObject {
  const canonical = canonicalResultOutput(input);
  const outputBytes = new TextEncoder().encode(canonical).byteLength;
  const resultHash = runtimeV2Sha256(canonical);
  if (input.receipt.outputBytes !== outputBytes || input.receipt.resultHash !== resultHash)
    throw new Error('Runtime V2 result receipt does not match canonical output');
  return {
    argumentHash: input.receipt.argumentHash,
    continuation: input.continuation,
    outputBytes,
    receipt: {
      completedAt: input.receipt.completedAt,
      durationMs: input.receipt.durationMs,
      invocationId: input.receipt.invocationId,
      receiptId: input.receipt.receiptId,
      redactionApplied: input.receipt.redactionApplied,
      startedAt: input.receipt.startedAt,
      truncated: input.receipt.truncated,
    },
    resultHash,
    status: input.status,
  };
}

function ttlMilliseconds(ttlSeconds: number): string {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 86_400)
    throw new Error('Runtime V2 TTL is invalid');
  return String(ttlSeconds * 1_000);
}

@Injectable()
export class RuntimeV2Store {
  private readonly logger = new Logger(RuntimeV2Store.name);

  constructor(@Inject(RedisService) private readonly redis: RuntimeV2RedisPort) {}

  private async execute(
    operation: RuntimeV2RedisOperation,
    keys: readonly string[],
    arguments_: readonly string[],
  ): Promise<ReturnType<typeof parseRuntimeV2TaggedReply>> {
    let raw: unknown;
    try {
      raw = await this.redis.executeRuntimeV2({ operation, keys, arguments: arguments_ });
    } catch (error) {
      // The CLIENT message stays deliberately opaque: a raw Redis or Lua error
      // can echo back argument fragments, so it must never cross the wire.
      // Discarding it on the server as well is a different mistake — it made
      // every RUNTIME_STATE_UNAVAILABLE undiagnosable, with no way to tell a
      // dropped connection from a Lua bug. The operation and the message are
      // recorded here; the arguments deliberately are not.
      this.logger.error(
        `Runtime V2 Redis operation ${operation} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw runtimeV2Unavailable();
    }
    return parseRuntimeV2TaggedReply(raw);
  }

  async start(input: RuntimeV2StartInput): Promise<RuntimeV2StartAck> {
    const request = runtimeStartSchema.parse(input.request);
    if (runtimeV2Sha256(JSON.stringify(request.toolDefinitions)) !== request.toolCatalogHash) {
      throw new Error('Runtime V2 tool catalog hash does not match its definitions');
    }
    let proposed = {
      runId: createRuntimeV2Identity('run'),
      generation: createRuntimeV2Identity('gen'),
    };
    let command = await this.executeStart(input, request, proposed);
    if (command.tag === 'REDIRECT') {
      const stored = startAckSchema.parse(JSON.parse(command.body));
      proposed = { runId: stored.runId, generation: stored.generation };
      command = await this.executeStart(input, request, proposed);
    }
    return {
      ...startAckSchema.parse(JSON.parse(command.body)),
      replayed: command.tag === 'REPLAY',
    };
  }

  private executeStart(
    input: RuntimeV2StartInput,
    request: RuntimeStartDto,
    proposed: Readonly<{ runId: string; generation: string }>,
  ): Promise<ReturnType<typeof parseRuntimeV2TaggedReply>> {
    const keys = runtimeV2KeyFamily(proposed.runId);
    const fingerprint = runtimeV2Sha256(
      stableRuntimeV2Json({ messageId: input.messageId, request }),
    );
    const snapshot = {
      ownerId: input.ownerId,
      threadId: request.threadId,
      messageId: input.messageId,
      clientRequestId: request.clientRequestId,
      epochs: stableRuntimeV2Json(request.epochs),
      idempotencyKey: request.idempotencyKey,
      manifestHash: request.manifestHash,
      toolCatalogHash: request.toolCatalogHash,
      // Stored pre-serialized, the same way `epochs` is, so the Lua can HSET it
      // as an opaque string and hand back the exact bytes the catalog hash was
      // computed over.
      toolDefinitions: JSON.stringify(request.toolDefinitions),
      provider: request.provider,
      model: request.model,
      // A client that names a provider and model pins the run to them: the
      // routed decision may not substitute anything else. A client that asks
      // the platform to route sends a sentinel, so the model is only decided —
      // and only becomes immutable — when the run is claimed.
      providerPinned:
        isAutoRouteSentinel(request.provider) || isAutoRouteSentinel(request.model) ? '0' : '1',
      budget: request.budget,
    };
    const ack = { ...proposed, messageId: input.messageId, sequence: 0 };
    return this.execute(
      RuntimeV2RedisOperation.START,
      [
        runtimeV2StartKey(input.ownerId, request.idempotencyKey),
        keys.state,
        keys.events,
        runtimeV2MessageKey(input.messageId),
        keys.acknowledgements,
        keys.invocations,
        keys.results,
        keys.steering,
        keys.steeringData,
        runtimeV2ClientRequestKey(input.ownerId, request.clientRequestId),
      ],
      [
        fingerprint,
        JSON.stringify(proposed),
        JSON.stringify(snapshot),
        eventJson(
          { runId: proposed.runId, epochs: request.epochs },
          'run.created',
          createRuntimeV2Identity('evt'),
          {},
        ),
        // The message binding is a DIFFERENT shape from the start ack, and it
        // is read back through `runtimeV2BindingSchema`, which is strict and
        // declares no `sequence`. Spreading `ack` here leaked the ack's cursor
        // field into the stored blob, so `resolveMessageBinding` rejected every
        // routed message with `Unrecognized key: "sequence"` — the run was
        // admitted, then died before the first model call, and the client sat
        // on "Request accepted" until the stream gave up.
        //
        // Only the two identifiers the ack and the binding genuinely share are
        // spread; everything else is named explicitly so the next field added
        // to the ack cannot leak in the same way.
        JSON.stringify({
          ...proposed,
          messageId: input.messageId,
          ownerId: input.ownerId,
          threadId: request.threadId,
          clientRequestId: request.clientRequestId,
          startIdempotencyKey: request.idempotencyKey,
          epochs: request.epochs,
          manifestHash: request.manifestHash,
          toolCatalogHash: request.toolCatalogHash,
          toolDefinitions: request.toolDefinitions,
          provider: request.provider,
          model: request.model,
        }),
        JSON.stringify(ack),
        ttlMilliseconds(input.ttlSeconds),
      ],
    );
  }

  private familyKeys(input: RuntimeV2BoundInput): readonly string[] {
    const keys = runtimeV2KeyFamily(input.runId);
    return [
      keys.state,
      keys.events,
      keys.acknowledgements,
      keys.invocations,
      keys.results,
      keys.steering,
      keys.steeringData,
      runtimeV2MessageKey(input.messageId),
      runtimeV2StartKey(input.ownerId, input.startIdempotencyKey),
      runtimeV2ClientRequestKey(input.ownerId, input.clientRequestId),
    ];
  }

  async resolveBinding(input: RuntimeV2BindingLookup): Promise<RuntimeV2BoundInput> {
    const keys = runtimeV2KeyFamily(input.runId);
    const reply = await this.execute(
      RuntimeV2RedisOperation.READ_BINDING,
      [
        keys.state,
        keys.events,
        keys.acknowledgements,
        keys.invocations,
        keys.results,
        keys.steering,
        keys.steeringData,
      ],
      [input.ownerId, input.threadId, input.runId, input.generation],
    );
    return {
      ...runtimeV2BindingSchema.parse(parseStoredBinding(reply.body)),
      ttlSeconds: input.ttlSeconds,
    };
  }

  async resolveMessageBinding(input: RuntimeV2MessageBindingLookup): Promise<RuntimeV2BoundInput> {
    const reply = await this.execute(
      RuntimeV2RedisOperation.READ_MESSAGE_BINDING,
      [runtimeV2MessageKey(input.messageId)],
      [input.messageId, input.threadId],
    );
    const mapped = runtimeV2BindingSchema.parse(parseStoredBinding(reply.body));
    const bound = await this.resolveBinding({
      ownerId: mapped.ownerId,
      threadId: mapped.threadId,
      runId: mapped.runId,
      generation: mapped.generation,
      ttlSeconds: input.ttlSeconds,
    });
    // The stored binding records what the client asked for; the routed decision
    // records what will actually run. The claim writes this pair back into the
    // run state, after which it is immutable for every later mutation.
    return { ...bound, provider: input.provider, model: input.model };
  }

  private async mutationReply(
    operation: RuntimeV2RedisOperation,
    input: RuntimeV2BoundInput,
    arguments_: readonly string[],
  ): Promise<RuntimeV2MutationAck> {
    const reply = await this.execute(operation, this.familyKeys(input), arguments_);
    return { ...mutationAckSchema.parse(JSON.parse(reply.body)), replayed: reply.tag === 'REPLAY' };
  }

  private mutationDraft(input: RuntimeV2BoundInput): RuntimeV2MutationDraft {
    const ack = { runId: input.runId, sequence: 0, eventId: createRuntimeV2Identity('evt') };
    return ack;
  }

  async admitInvocation(input: RuntimeV2InvocationInput): Promise<RuntimeV2MutationAck> {
    const invocation = toolInvocationSchema.parse(input.invocation);
    if (invocation.runId !== input.runId)
      throw new Error('Runtime V2 invocation run does not match the bound run');
    assertEpochs(invocation.epochs, input);
    const ack = this.mutationDraft(input);
    const requestedEventId = createRuntimeV2Identity('evt');
    return this.mutationReply(RuntimeV2RedisOperation.ADMIT_INVOCATION, input, [
      binding(input),
      invocation.idempotencyKey,
      runtimeV2Sha256(stableRuntimeV2Json(invocation)),
      invocation.invocationId,
      runtimeV2Sha256(stableRuntimeV2Json(invocation.arguments)),
      JSON.stringify(ack),
      eventJson(
        input,
        'tool.requested',
        requestedEventId,
        {
          invocationId: invocation.invocationId,
          invocation,
          operation: invocation.operation,
          toolName: invocation.toolName,
        },
        { invocationId: invocation.invocationId },
      ),
      eventJson(
        input,
        'tool.started',
        ack.eventId,
        { invocationId: invocation.invocationId },
        { invocationId: invocation.invocationId },
      ),
      ttlMilliseconds(input.ttlSeconds),
    ]);
  }

  async submitResult(input: RuntimeV2ResultInput): Promise<RuntimeV2MutationAck> {
    const command = runtimeResultSchema.parse(input.command);
    if (command.generation !== input.generation)
      throw new Error('Runtime V2 result generation does not match the bound run');
    assertEpochs(command.epochs, input);
    const verification = verifiedResult(command.result);
    const ack = this.mutationDraft(input);
    return this.mutationReply(RuntimeV2RedisOperation.RESULT, input, [
      binding(input),
      command.idempotencyKey,
      runtimeV2Sha256(stableRuntimeV2Json(command)),
      command.result.invocationId,
      JSON.stringify(verification),
      JSON.stringify(ack),
      eventJson(
        input,
        'tool.completed',
        ack.eventId,
        {
          invocationId: command.result.invocationId,
          receipt: {
            durationMs: command.result.receipt.durationMs,
            outputBytes: command.result.receipt.outputBytes,
            receiptId: command.result.receipt.receiptId,
            redactionApplied: command.result.receipt.redactionApplied,
            truncated: command.result.receipt.truncated,
          },
          status: command.result.status,
        },
        { invocationId: command.result.invocationId },
      ),
      ttlMilliseconds(input.ttlSeconds),
    ]);
  }

  async submitSteering(input: RuntimeV2SteeringInput): Promise<RuntimeV2MutationAck> {
    const command = runtimeSteeringSchema.parse(input.command);
    if (command.generation !== input.generation || command.steering.runId !== input.runId)
      throw new Error('Runtime V2 steering identity does not match the bound run');
    assertEpochs(command.steering.epochs, input);
    const ack = this.mutationDraft(input);
    return this.mutationReply(RuntimeV2RedisOperation.STEERING, input, [
      binding(input),
      command.steering.idempotencyKey,
      runtimeV2Sha256(stableRuntimeV2Json(command)),
      command.steering.steeringId,
      JSON.stringify({
        idempotencyKey: command.steering.idempotencyKey,
        steeringId: command.steering.steeringId,
        sequence: command.steering.sequence,
      }),
      JSON.stringify(ack),
      eventJson(input, 'run.steering.received', ack.eventId, {
        steeringId: command.steering.steeringId,
        sequence: command.steering.sequence,
      }),
      ttlMilliseconds(input.ttlSeconds),
    ]);
  }

  async cancel(input: RuntimeV2CancelInput): Promise<RuntimeV2MutationAck> {
    const command = runtimeCancelSchema.parse(input.command);
    if (command.generation !== input.generation)
      throw new Error('Runtime V2 cancellation generation does not match the bound run');
    assertEpochs(command.epochs, input);
    const ack = this.mutationDraft(input);
    return this.mutationReply(RuntimeV2RedisOperation.CANCEL, input, [
      binding(input),
      command.idempotencyKey,
      runtimeV2Sha256(stableRuntimeV2Json(command)),
      JSON.stringify(command),
      JSON.stringify(ack),
      eventJson(input, 'run.cancelled', ack.eventId, {}),
      ttlMilliseconds(input.ttlSeconds),
    ]);
  }

  async claimRouted(input: RuntimeV2ClaimInput): Promise<RuntimeV2ClaimAck> {
    const claimId = createRuntimeV2Identity('claim');
    const source = {
      messageId: input.messageId,
      provider: input.provider,
      model: input.model,
      deliveryId: input.deliveryId,
    };
    const ack = {
      runId: input.runId,
      sequence: 0,
      eventId: createRuntimeV2Identity('evt'),
      claimId,
    };
    const reply = await this.execute(RuntimeV2RedisOperation.CLAIM_ROUTED, this.familyKeys(input), [
      binding(input),
      input.deliveryId,
      runtimeV2Sha256(stableRuntimeV2Json(source)),
      JSON.stringify({
        runId: input.runId,
        generation: input.generation,
        ownerId: input.ownerId,
        threadId: input.threadId,
        messageId: input.messageId,
        clientRequestId: input.clientRequestId,
        manifestHash: input.manifestHash,
        toolCatalogHash: input.toolCatalogHash,
        toolDefinitions: input.toolDefinitions,
        provider: input.provider,
        model: input.model,
      }),
      JSON.stringify(ack),
      eventJson(
        input,
        'run.claimed',
        ack.eventId,
        { status: 'claimed' },
        undefined,
        'internal-state',
      ),
      ttlMilliseconds(input.ttlSeconds),
    ]);
    return {
      ...claimAckSchema.parse(JSON.parse(reply.body)),
      replayed: reply.tag === 'REPLAY',
      claimed: reply.tag === 'CLAIMED',
    };
  }

  async terminalize(input: RuntimeV2TerminalInput): Promise<RuntimeV2MutationAck> {
    const ack = this.mutationDraft(input);
    const fingerprint = await runtimeV2TerminalFingerprint(input);
    return this.mutationReply(RuntimeV2RedisOperation.TERMINAL, input, [
      binding(input),
      input.idempotencyKey,
      fingerprint,
      input.claimId,
      JSON.stringify({ status: input.status, completedAt: input.completedAt }),
      JSON.stringify(ack),
      eventJson(
        input,
        `run.${input.status}`,
        ack.eventId,
        input.reason === undefined ? {} : { reason: { ...input.reason } },
      ),
      ttlMilliseconds(input.ttlSeconds),
    ]);
  }

  /**
   * Publishes one model turn's output onto the run journal.
   *
   * Every event is allocated its own sequence inside the script, so the turn
   * marker, the text and the summary keep the order they happened in and a
   * client reading by cursor never sees a delta before its turn opens.
   */
  async appendModelOutput(input: RuntimeV2ModelOutputInput): Promise<RuntimeV2MutationAck> {
    const ack = this.mutationDraft(input);
    const events = buildRuntimeV2ModelEvents(input.turnId, input.text).map((event) =>
      JSON.parse(
        eventJson(input, event.type, createRuntimeV2Identity('evt'), { ...event.payload }),
      ),
    );
    return this.mutationReply(RuntimeV2RedisOperation.APPEND_MODEL_OUTPUT, input, [
      binding(input),
      input.idempotencyKey,
      runtimeV2Sha256(stableRuntimeV2Json(input)),
      input.claimId,
      JSON.stringify(ack),
      JSON.stringify(events),
      ttlMilliseconds(input.ttlSeconds),
    ]);
  }

  async markProviderDispatched(input: RuntimeV2DispatchInput): Promise<RuntimeV2MutationAck> {
    const ack = this.mutationDraft(input);
    return this.mutationReply(RuntimeV2RedisOperation.MARK_DISPATCHED, input, [
      binding(input),
      input.idempotencyKey,
      runtimeV2Sha256(stableRuntimeV2Json(input)),
      input.claimId,
      JSON.stringify(ack),
      eventJson(
        input,
        'run.provider-dispatched',
        ack.eventId,
        { status: 'dispatched' },
        undefined,
        'internal-state',
      ),
      ttlMilliseconds(input.ttlSeconds),
    ]);
  }

  async readEvents(input: RuntimeV2ReadInput): Promise<RuntimeV2ReadAck> {
    const reply = await this.execute(RuntimeV2RedisOperation.READ_EVENTS, this.familyKeys(input), [
      binding(input),
      String(input.after),
    ]);
    const parsed = readAckSchema.parse(JSON.parse(reply.body));
    const events = parsed.events.map((event) =>
      runtimeEventSchema.parse(typeof event === 'string' ? JSON.parse(event) : event),
    );
    return { runId: parsed.runId, terminal: parsed.terminal, events };
  }
}
