import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Permission } from '@claw/shared-types';

import { BusinessException } from '../../../common/errors';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  RUNTIME_ADMISSION_RELEASE_LUA,
  RUNTIME_ADMISSION_RESERVE_LUA,
  RUNTIME_ADMISSION_UNLIMITED,
} from '../constants/runtime-admission.constants';
import {
  runtimeAdmissionAckSchema,
  type RuntimeAdmissionDto,
  type RuntimeAdmissionReleaseDto,
} from '../dto/runtime-admission.dto';
import type {
  RuntimeAdmissionAck,
  RuntimeAdmissionRedisReply,
} from '../types/runtime-admission.types';
import {
  runtimeAdmissionAck,
  runtimeAdmissionFingerprint,
  runtimeAdmissionKey,
  runtimeAdmissionQuotaKey,
  runtimeAdmissionTtl,
} from '../utilities/runtime-admission.utility';
import { EntitlementsService } from './entitlements.service';

@Injectable()
export class RuntimeAdmissionService {
  private readonly logger = new Logger(RuntimeAdmissionService.name);

  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly redis: RedisService,
  ) {}

  async reserve(input: RuntimeAdmissionDto): Promise<RuntimeAdmissionAck> {
    const entitlement = await this.entitlements.getEnforcedForUser(input.userId);
    this.assertPermission(entitlement.isAdmin, entitlement.permissions, Permission.AGENT_USE);
    this.assertPermission(entitlement.isAdmin, entitlement.permissions, Permission.CHAT_USE);
    if (!this.isPrimaryModelAllowed(entitlement, input.provider, input.model)) {
      throw new BusinessException(
        'The selected model is not available for Runtime V2',
        'RUNTIME_MODEL_DENIED',
        HttpStatus.FORBIDDEN,
      );
    }

    const now = new Date();
    const acknowledgement = runtimeAdmissionAck(
      input,
      entitlement.plan?.id ?? null,
      entitlement.isAdmin,
    );
    const reservedTokens = entitlement.isAdmin ? 0 : input.estimatedTokens;
    const dailyLimit = entitlement.isAdmin
      ? RUNTIME_ADMISSION_UNLIMITED
      : entitlement.quota.dailyLimit;

    const reply = await this.reserveInRedis(
      input,
      now,
      reservedTokens,
      dailyLimit,
      acknowledgement,
    );

    if (reply[0] === 'CONFLICT') {
      throw new BusinessException(
        'Runtime admission request conflicts with an earlier request',
        reply[1],
        HttpStatus.CONFLICT,
      );
    }
    if (reply[0] === 'DENIED') {
      throw new BusinessException(
        'Runtime token quota is exhausted',
        reply[1],
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const stored = this.parseAcknowledgement(reply[1]);
    return { ...stored, replayed: reply[0] === 'REPLAY' };
  }

  async release(input: RuntimeAdmissionReleaseDto): Promise<void> {
    const now = new Date();
    try {
      await this.redis
        .getClient()
        .eval(
          RUNTIME_ADMISSION_RELEASE_LUA,
          2,
          runtimeAdmissionKey(input.userId, input.requestId),
          runtimeAdmissionQuotaKey(input.userId, now),
        );
    } catch {
      throw new BusinessException(
        'Runtime admission release is temporarily unavailable',
        'RUNTIME_ADMISSION_RELEASE_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async reserveInRedis(
    input: RuntimeAdmissionDto,
    now: Date,
    reservedTokens: number,
    dailyLimit: number,
    acknowledgement: RuntimeAdmissionAck,
  ): Promise<RuntimeAdmissionRedisReply> {
    try {
      const raw = await this.redis
        .getClient()
        .eval(
          RUNTIME_ADMISSION_RESERVE_LUA,
          2,
          runtimeAdmissionKey(input.userId, input.requestId),
          runtimeAdmissionQuotaKey(input.userId, now),
          runtimeAdmissionFingerprint(input),
          String(reservedTokens),
          String(dailyLimit),
          String(runtimeAdmissionTtl(now)),
          JSON.stringify(acknowledgement),
        );
      return this.parseReply(raw);
    } catch (error) {
      // Log the cause before collapsing it into a generic 503. Swallowing it
      // silently meant a Redis or Lua fault surfaced to the user as
      // "temporarily unavailable" with nothing on the server to explain it,
      // which is indistinguishable from the service simply being down.
      this.logger.error(
        `Runtime admission reserve failed userId=${input.userId} requestId=${input.requestId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BusinessException(
        'Runtime admission is temporarily unavailable',
        'RUNTIME_ADMISSION_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private assertPermission(
    isAdmin: boolean,
    permissions: readonly Permission[],
    permission: Permission,
  ): void {
    if (!isAdmin && !permissions.includes(permission)) {
      throw new BusinessException(
        'Runtime permission is required',
        'RUNTIME_PERMISSION_DENIED',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private isPrimaryModelAllowed(
    entitlement: Awaited<ReturnType<EntitlementsService['getForUser']>>,
    provider: string,
    model: string,
  ): boolean {
    if (entitlement.isAdmin) return true;
    if (
      entitlement.modelAccessMode === 'ALLOW_ALL' ||
      entitlement.modelAccessMode === 'LEGACY_UNRESTRICTED'
    )
      return true;
    if (entitlement.modelAccessMode === 'DENY_ALL') return false;
    return entitlement.allowedModels.some(
      (entry) =>
        entry.provider === provider &&
        entry.model === model &&
        entry.isAllowed &&
        entry.allowAsPrimary,
    );
  }

  private parseReply(raw: unknown): RuntimeAdmissionRedisReply {
    if (
      !Array.isArray(raw) ||
      raw.length !== 2 ||
      !['OK', 'REPLAY', 'CONFLICT', 'DENIED'].includes(String(raw[0])) ||
      typeof raw[1] !== 'string'
    ) {
      throw new Error('Invalid Runtime V2 admission reply');
    }
    return [String(raw[0]) as RuntimeAdmissionRedisReply[0], raw[1]];
  }

  private parseAcknowledgement(raw: string): RuntimeAdmissionAck {
    return runtimeAdmissionAckSchema.parse(JSON.parse(raw));
  }
}
