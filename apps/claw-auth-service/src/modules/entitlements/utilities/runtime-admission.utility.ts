import { createHash, randomUUID } from 'node:crypto';

import {
  quotaKey,
  secondsUntilEndOfUtcDay,
  utcDateString,
} from '../../quota/constants/quota.constants';
import type { RuntimeAdmissionDto } from '../dto/runtime-admission.dto';
import type { RuntimeAdmissionAck } from '../types/runtime-admission.types';

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function runtimeAdmissionKey(userId: string, requestId: string): string {
  return `runtime-admission:{${sha256(userId)}}:${sha256(requestId)}`;
}

export function runtimeAdmissionQuotaKey(userId: string, now: Date): string {
  return quotaKey(userId, utcDateString(now));
}

export function runtimeAdmissionFingerprint(input: RuntimeAdmissionDto): string {
  return sha256(
    JSON.stringify({
      estimatedTokens: input.estimatedTokens,
      model: input.model,
      provider: input.provider,
      requestId: input.requestId,
      userId: input.userId,
    }),
  );
}

export function runtimeAdmissionAck(
  input: RuntimeAdmissionDto,
  planId: string | null,
  adminBypass: boolean,
): RuntimeAdmissionAck {
  return {
    requestId: input.requestId,
    planId,
    estimatedTokens: input.estimatedTokens,
    reservationId: randomUUID(),
    replayed: false,
    adminBypass,
  };
}

export function runtimeAdmissionTtl(now: Date): number {
  return secondsUntilEndOfUtcDay(now);
}
