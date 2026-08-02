import { RUNTIME_V2_REDIS_PREFIX } from '../constants/runtime-v2.constants';
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
