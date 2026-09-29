import { RUNTIME_V2_REDIS_PREFIX } from '../constants/runtime-v2.constants';
import { RUNTIME_V2_LOADED_TOOLS_KEY_SUFFIX } from '../constants/runtime-v2-deferred-tools.constants';
import type { RuntimeV2KeyFamily } from '../types/runtime-v2-store.types';
import { runtimeV2Sha256 } from './runtime-v2-identity.utility';

export function runtimeV2KeyFamily(runId: string): RuntimeV2KeyFamily {
  const base = `${RUNTIME_V2_REDIS_PREFIX}:run:${runId}`;
  return {
    state: `${base}:state`,
    events: `${base}:events`,
    acknowledgements: `${base}:acks`,
    invocations: `${base}:invocations`,
    results: `${base}:results`,
    steering: `${base}:steering`,
    steeringData: `${base}:steering-data`,
  };
}

/** Loaded deferred definitions for one run (F028); same hash slot as its family. */
export function runtimeV2LoadedToolsKey(runId: string): string {
  return `${RUNTIME_V2_REDIS_PREFIX}:run:${runId}:${RUNTIME_V2_LOADED_TOOLS_KEY_SUFFIX}`;
}

export function runtimeV2MessageKey(messageId: string): string {
  return `${RUNTIME_V2_REDIS_PREFIX}:message:${runtimeV2Sha256(messageId).slice(7)}`;
}

export function runtimeV2StartKey(ownerId: string, idempotencyKey: string): string {
  const digest = runtimeV2Sha256(`${ownerId}\u0000${idempotencyKey}`).slice(7);
  return `${RUNTIME_V2_REDIS_PREFIX}:start:${digest}`;
}

export function runtimeV2ClientRequestKey(ownerId: string, clientRequestId: string): string {
  const digest = runtimeV2Sha256(`${ownerId}\u0000${clientRequestId}`).slice(7);
  return `${RUNTIME_V2_REDIS_PREFIX}:client-request:${digest}`;
}
