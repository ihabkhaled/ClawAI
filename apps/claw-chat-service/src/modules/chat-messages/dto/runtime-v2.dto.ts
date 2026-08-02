import { z } from 'zod';

import {
  RUNTIME_V2_ARGUMENT_BYTES,
  RUNTIME_V2_ERROR_CODE_PATTERN,
  RUNTIME_V2_ERROR_DETAIL_BYTES,
  RUNTIME_V2_EVENT_TYPE_PATTERN,
  RUNTIME_V2_ID_PATTERN,
  RUNTIME_V2_JSON_DEPTH,
  RUNTIME_V2_JSON_ENTRIES,
  RUNTIME_V2_JSON_KEY_CHARACTERS,
  RUNTIME_V2_JSON_STRING_CHARACTERS,
  RUNTIME_V2_MAX_CURSOR,
  RUNTIME_V2_OPERATION_PATTERN,
  RUNTIME_V2_PROMPT_BYTES,
  RUNTIME_V2_RESULT_BYTES,
  RUNTIME_V2_RESULT_STATUSES,
  RUNTIME_V2_RISK_CLASSES,
  RUNTIME_V2_SCHEMA_VERSION,
  RUNTIME_V2_SHA256_PATTERN,
  RUNTIME_V2_STEERING_BYTES,
  RUNTIME_V2_TOOL_CATALOG_BYTES,
  RUNTIME_V2_TOOL_CATALOG_ENTRIES,
  RUNTIME_V2_TOOL_NAME_PATTERN,
} from '../constants/runtime-v2.constants';
import type { RuntimeV2JsonObject, RuntimeV2JsonValue } from '../types/runtime-v2.types';

const utf8Bytes = (value: string): number => new TextEncoder().encode(value).byteLength;
const boundedText = (maxBytes: number): z.ZodString =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxBytes)
    .refine((value) => utf8Bytes(value) <= maxBytes);
const safeKeySchema = z
  .string()
  .min(1)
  .max(RUNTIME_V2_JSON_KEY_CHARACTERS)
  .refine((value) => !['__proto__', 'constructor', 'prototype'].includes(value));
const jsonPrimitiveSchema = z.union([
  z.null(),
  z.boolean(),
  z.number().finite(),
  z.string().max(RUNTIME_V2_JSON_STRING_CHARACTERS),
]);

function jsonValueAtDepth(depth: number): z.ZodType<RuntimeV2JsonValue> {
  if (depth === 0) return jsonPrimitiveSchema;
  const child = jsonValueAtDepth(depth - 1);
  return z.union([
    jsonPrimitiveSchema,
    z.array(child).max(RUNTIME_V2_JSON_ENTRIES),
    z
      .record(safeKeySchema, child)
      .refine((value) => Object.keys(value).length <= RUNTIME_V2_JSON_ENTRIES),
  ]);
}

const runtimeJsonValueSchema = jsonValueAtDepth(RUNTIME_V2_JSON_DEPTH);
const runtimeJsonObjectSchema: z.ZodType<RuntimeV2JsonObject> = z
  .record(safeKeySchema, runtimeJsonValueSchema)
  .refine((value) => Object.keys(value).length <= RUNTIME_V2_JSON_ENTRIES);
const boundedJsonObject = (maxBytes: number): z.ZodType<RuntimeV2JsonObject> =>
  runtimeJsonObjectSchema.refine(
    (value) => utf8Bytes(JSON.stringify(value)) <= maxBytes,
    `Runtime JSON exceeds ${String(maxBytes)} bytes`,
  );

export const runtimeEpochsSchema = z
  .object({
    account: z.number().int().nonnegative().max(RUNTIME_V2_MAX_CURSOR),
    workspace: z.number().int().nonnegative().max(RUNTIME_V2_MAX_CURSOR),
    target: z.number().int().nonnegative().max(RUNTIME_V2_MAX_CURSOR),
    policy: z.number().int().nonnegative().max(RUNTIME_V2_MAX_CURSOR),
  })
  .strict();

export const toolDefinitionSchema = z
  .object({
    schemaVersion: z.literal(RUNTIME_V2_SCHEMA_VERSION),
    name: z.string().min(2).max(80).regex(RUNTIME_V2_TOOL_NAME_PATTERN),
    version: z.string().min(1).max(40),
    description: z.string().trim().min(1).max(2_000),
    operations: z
      .array(z.string().min(1).max(80).regex(RUNTIME_V2_OPERATION_PATTERN))
      .min(1)
      .max(100),
    riskClasses: z.array(z.enum(RUNTIME_V2_RISK_CLASSES)).min(1).max(13),
    targetIds: z.array(z.string().regex(RUNTIME_V2_ID_PATTERN)).min(1).max(32),
    inputSchema: boundedJsonObject(RUNTIME_V2_ARGUMENT_BYTES),
  })
  .strict()
  .superRefine((definition, context) => {
    for (const [values, label, path] of [
      [definition.operations, 'operation', 'operations'],
      [definition.riskClasses, 'risk class', 'riskClasses'],
      [definition.targetIds, 'target', 'targetIds'],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({ code: 'custom', message: `Duplicate ${label}`, path: [path] });
      }
    }
  });

const toolCatalogSchema = z
  .array(toolDefinitionSchema)
  .min(1)
  .max(RUNTIME_V2_TOOL_CATALOG_ENTRIES)
  .superRefine((definitions, context) => {
    const identities = definitions.map((definition) => `${definition.name}@${definition.version}`);
    if (new Set(identities).size !== identities.length) {
      context.addIssue({ code: 'custom', message: 'Duplicate tool catalog identity' });
    }
    if (utf8Bytes(JSON.stringify(definitions)) > RUNTIME_V2_TOOL_CATALOG_BYTES) {
      context.addIssue({ code: 'custom', message: 'Tool catalog exceeds its byte limit' });
    }
  });

export const toolInvocationSchema = z
  .object({
    schemaVersion: z.literal(RUNTIME_V2_SCHEMA_VERSION),
    invocationId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    runId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    turnId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    toolName: z.string().min(2).max(80).regex(RUNTIME_V2_TOOL_NAME_PATTERN),
    toolVersion: z.string().min(1).max(40),
    operation: z.string().min(1).max(80).regex(RUNTIME_V2_OPERATION_PATTERN),
    arguments: boundedJsonObject(RUNTIME_V2_ARGUMENT_BYTES),
    targetId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    epochs: runtimeEpochsSchema,
    idempotencyKey: z.string().regex(RUNTIME_V2_ID_PATTERN),
    requestedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const toolErrorSchema = z
  .object({
    code: z.string().regex(RUNTIME_V2_ERROR_CODE_PATTERN),
    message: z.string().trim().min(1).max(2_000),
    retryable: z.boolean(),
    redactionApplied: z.boolean(),
    details: boundedJsonObject(RUNTIME_V2_ERROR_DETAIL_BYTES).optional(),
  })
  .strict();

export const toolReceiptSchema = z
  .object({
    schemaVersion: z.literal(RUNTIME_V2_SCHEMA_VERSION),
    receiptId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    invocationId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    argumentHash: z.string().regex(RUNTIME_V2_SHA256_PATTERN),
    resultHash: z.string().regex(RUNTIME_V2_SHA256_PATTERN).optional(),
    startedAt: z.iso.datetime({ offset: true }),
    completedAt: z.iso.datetime({ offset: true }),
    durationMs: z.number().int().nonnegative().max(86_400_000),
    outputBytes: z.number().int().nonnegative().max(16_777_216),
    truncated: z.boolean(),
    redactionApplied: z.boolean(),
  })
  .strict()
  .refine((receipt) => Date.parse(receipt.completedAt) >= Date.parse(receipt.startedAt));

export const continuationSchema = z
  .object({
    action: z.enum(['continue', 'final', 'repair']),
    nextTurnId: z.string().regex(RUNTIME_V2_ID_PATTERN).optional(),
    repairAttempt: z.literal(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === 'continue' && value.nextTurnId === undefined)
      context.addIssue({ code: 'custom', message: 'Continue requires nextTurnId' });
    if (value.action !== 'continue' && value.nextTurnId !== undefined)
      context.addIssue({ code: 'custom', message: 'nextTurnId requires continue' });
    if (value.action === 'repair' && value.repairAttempt !== 1)
      context.addIssue({ code: 'custom', message: 'Repair requires attempt 1' });
    if (value.action !== 'repair' && value.repairAttempt !== undefined)
      context.addIssue({ code: 'custom', message: 'repairAttempt requires repair' });
  });

export const toolResultSchema = z
  .object({
    schemaVersion: z.literal(RUNTIME_V2_SCHEMA_VERSION),
    invocationId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    status: z.enum(RUNTIME_V2_RESULT_STATUSES),
    structured: boundedJsonObject(RUNTIME_V2_RESULT_BYTES).optional(),
    modelText: z.string().max(65_536).optional(),
    error: toolErrorSchema.optional(),
    receipt: toolReceiptSchema,
    continuation: continuationSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'succeeded' && value.error !== undefined)
      context.addIssue({ code: 'custom', message: 'Succeeded result cannot contain error' });
    if (value.status !== 'succeeded' && value.error === undefined)
      context.addIssue({ code: 'custom', message: 'Failed result requires error' });
    if (value.receipt.invocationId !== value.invocationId)
      context.addIssue({ code: 'custom', message: 'Receipt invocation mismatch' });
  });

export const runBudgetSchema = z
  .object({
    maxModelTurns: z.number().int().min(1).max(100),
    maxToolCalls: z.number().int().min(0).max(500),
    maxToolRounds: z.number().int().min(0).max(100),
    maxRepairAttempts: z.number().int().min(0).max(1),
    maxRuntimeMs: z.number().int().min(1_000).max(7_200_000),
    maxOutputBytes: z.number().int().min(1_024).max(16_777_216),
    maxToolResultBytes: z.number().int().min(1_024).max(1_048_576),
  })
  .strict()
  .refine((value) => value.maxToolRounds <= value.maxToolCalls);

export const steeringMessageSchema = z
  .object({
    schemaVersion: z.literal(RUNTIME_V2_SCHEMA_VERSION),
    steeringId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    runId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    sequence: z.number().int().nonnegative().max(RUNTIME_V2_MAX_CURSOR),
    idempotencyKey: z.string().regex(RUNTIME_V2_ID_PATTERN),
    message: boundedText(RUNTIME_V2_STEERING_BYTES),
    epochs: runtimeEpochsSchema,
    receivedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const runtimeStartSchema = z
  .object({
    schemaVersion: z.literal(RUNTIME_V2_SCHEMA_VERSION),
    threadId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    clientRequestId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    idempotencyKey: z.string().regex(RUNTIME_V2_ID_PATTERN),
    prompt: boundedText(RUNTIME_V2_PROMPT_BYTES),
    manifestHash: z.string().regex(RUNTIME_V2_SHA256_PATTERN),
    toolCatalogHash: z.string().regex(RUNTIME_V2_SHA256_PATTERN),
    toolDefinitions: toolCatalogSchema,
    provider: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(160),
    epochs: runtimeEpochsSchema,
    budget: runBudgetSchema,
  })
  .strict();

export const runtimeResultSchema = z
  .object({
    generation: z.string().regex(RUNTIME_V2_ID_PATTERN),
    idempotencyKey: z.string().regex(RUNTIME_V2_ID_PATTERN),
    epochs: runtimeEpochsSchema,
    result: toolResultSchema,
  })
  .strict();

export const runtimeSteeringSchema = z
  .object({
    generation: z.string().regex(RUNTIME_V2_ID_PATTERN),
    steering: steeringMessageSchema,
  })
  .strict();

export const runtimeCancelSchema = z
  .object({
    generation: z.string().regex(RUNTIME_V2_ID_PATTERN),
    idempotencyKey: z.string().regex(RUNTIME_V2_ID_PATTERN),
    epochs: runtimeEpochsSchema,
    requestedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const runtimeStreamQuerySchema = z
  .object({
    protocol: z.literal('v2'),
    runId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    generation: z.string().regex(RUNTIME_V2_ID_PATTERN),
    after: z.coerce.number().int().min(-1).max(RUNTIME_V2_MAX_CURSOR).default(-1),
  })
  .strict();

export const runtimeRunCommandQuerySchema = z
  .object({ threadId: z.string().regex(RUNTIME_V2_ID_PATTERN) })
  .strict();

export const runtimeEventSchema = z
  .object({
    schemaVersion: z.literal(RUNTIME_V2_SCHEMA_VERSION),
    eventId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    runId: z.string().regex(RUNTIME_V2_ID_PATTERN),
    agentId: z.string().regex(RUNTIME_V2_ID_PATTERN).nullable().optional(),
    turnId: z.string().regex(RUNTIME_V2_ID_PATTERN).nullable().optional(),
    sequence: z.number().int().nonnegative().max(RUNTIME_V2_MAX_CURSOR),
    timestamp: z.iso.datetime({ offset: true }),
    type: z.string().min(3).max(120).regex(RUNTIME_V2_EVENT_TYPE_PATTERN),
    visibility: z.enum(['user', 'audit', 'internal-state']),
    sensitivity: z.enum(['public', 'workspace', 'sensitive-redacted']),
    epochs: runtimeEpochsSchema,
    payload: boundedJsonObject(RUNTIME_V2_RESULT_BYTES),
    correlation: z
      .object({
        requestId: z.string().regex(RUNTIME_V2_ID_PATTERN).nullable().optional(),
        invocationId: z.string().regex(RUNTIME_V2_ID_PATTERN).nullable().optional(),
        taskId: z.string().regex(RUNTIME_V2_ID_PATTERN).nullable().optional(),
        parentEventId: z.string().regex(RUNTIME_V2_ID_PATTERN).nullable().optional(),
        causationId: z.string().regex(RUNTIME_V2_ID_PATTERN).nullable().optional(),
      })
      .strict()
      .optional(),
    contentHash: z.string().regex(RUNTIME_V2_SHA256_PATTERN).optional(),
  })
  .strict();

export type RuntimeEpochsDto = z.infer<typeof runtimeEpochsSchema>;
export type RuntimeStartDto = z.infer<typeof runtimeStartSchema>;
export type RuntimeResultDto = z.infer<typeof runtimeResultSchema>;
export type RuntimeSteeringDto = z.infer<typeof runtimeSteeringSchema>;
export type RuntimeCancelDto = z.infer<typeof runtimeCancelSchema>;
export type RuntimeStreamQueryDto = z.infer<typeof runtimeStreamQuerySchema>;
export type RuntimeRunCommandQueryDto = z.infer<typeof runtimeRunCommandQuerySchema>;
export type ToolDefinitionDto = z.infer<typeof toolDefinitionSchema>;
export type ToolInvocationDto = z.infer<typeof toolInvocationSchema>;
export type ToolResultDto = z.infer<typeof toolResultSchema>;
export type RunBudgetDto = z.infer<typeof runBudgetSchema>;
export type RuntimeEventDto = z.infer<typeof runtimeEventSchema>;
