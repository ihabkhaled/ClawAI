import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  PLUGIN_CALL_ID_PREFIX,
  PLUGIN_DEFAULT_MAX_CALLS_PER_TURN,
  PLUGIN_DEFAULT_MAX_ROUNDS,
  PLUGIN_HARD_MAX_CALLS_PER_TURN,
  PLUGIN_HARD_MAX_ROUNDS,
  PLUGIN_INVOKE_PATH,
  PLUGIN_INVOKE_TIMEOUT_MS,
  PLUGIN_RESOLVE_PATH,
  PLUGIN_RESOLVE_TIMEOUT_MS,
} from '../constants/plugin-tools.constants';
import { PluginInvokeStatus } from '../enums/plugin-invoke-status.enum';
import { PluginNoticeCode } from '../enums/plugin-notice-code.enum';
import type {
  PluginInvokeRequest,
  PluginInvokeResult,
  PluginResolveRequest,
  PluginResolveResult,
} from '../types/plugin-tools.types';
import { PluginInvokePort } from './plugin-invoke.port';

const resolvedToolSchema = z.object({
  nativeName: z.string().min(1).max(64),
  installId: z.string().min(1).max(64),
  pluginSlug: z.string().min(1).max(64),
  toolName: z.string().min(1).max(64),
  title: z.string().max(200).default(''),
  description: z.string().max(4_000).default(''),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  riskLevel: z.enum(['READ', 'WRITE', 'DESTRUCTIVE']),
});

const resolveResponseSchema = z.object({
  tools: z.array(resolvedToolSchema).max(64).default([]),
  systemBlock: z.string().max(8_000).default(''),
  limits: z
    .object({
      maxRounds: z.number().int().positive().optional(),
      maxCallsPerTurn: z.number().int().positive().optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .default({}),
  notices: z
    .array(z.object({ code: z.string().max(80), pluginSlug: z.string().max(64).optional() }))
    .default([]),
});

/** plugin-service sends explicit nulls for "no content" and "no error code". */
const invokeResponseSchema = z.object({
  status: z.nativeEnum(PluginInvokeStatus),
  content: z.string().nullish(),
  truncated: z.boolean().default(false),
  durationMs: z.number().nonnegative().default(0),
  errorCode: z.string().max(80).nullish(),
});

/** An HTTP error body from plugin-service carries a stable `errorCode` (409, 403, 503, ...). */
const errorBodySchema = z.object({ errorCode: z.string().max(80) });

const NOTICE_CODES: readonly string[] = Object.values(PluginNoticeCode);

function isNoticeCode(value: string): value is PluginNoticeCode {
  return NOTICE_CODES.includes(value);
}

/**
 * The HTTP adapter for {@link PluginInvokePort}: plugin-service's internal routes,
 * (under the global `/api/v1` prefix), called with the service credential and the owner's user id
 * in the body.
 * plugin-service is the authority on ownership, plan gates, consent, quota and
 * the invocation audit; this client trusts none of it blindly and parses every
 * answer against a schema.
 */
/** plugin-service names surfaces in lower case (`best_of_n`); chat-service's enum is upper case. */
function wireSurface(surface: PluginInvokeRequest['surface']): string {
  return surface.toLowerCase();
}

/**
 * The body plugin-service's internal invoke route validates (strictly): a fresh `callId` per
 * attempt (its idempotency key), no empty ids, and the owner named in `userId`.
 */
function toInvokeBody(request: PluginInvokeRequest): Record<string, unknown> {
  return {
    userId: request.userId,
    installId: request.installId,
    toolName: request.toolName,
    args: request.args,
    callId: `${PLUGIN_CALL_ID_PREFIX}${randomUUID()}`,
    surface: wireSurface(request.surface),
    tainted: request.tainted,
    ...(request.conversationId === '' ? {} : { conversationId: request.conversationId }),
    ...(request.messageId === undefined || request.messageId === ''
      ? {}
      : { messageId: request.messageId }),
  };
}

@Injectable()
export class PluginInvokeClient extends PluginInvokePort {
  private readonly logger = new Logger(PluginInvokeClient.name);

  async resolve(request: PluginResolveRequest): Promise<PluginResolveResult> {
    const response = await httpRequest<unknown>({
      url: `${AppConfig.get().PLUGIN_SERVICE_URL}${PLUGIN_RESOLVE_PATH}`,
      method: HttpMethod.POST,
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: { ...request, surface: wireSurface(request.surface) },
      timeoutMs: PLUGIN_RESOLVE_TIMEOUT_MS,
    });
    if (!response.ok) {
      throw new Error(`plugin resolve answered ${String(response.status)}`);
    }
    const parsed = resolveResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      this.logger.warn('resolve: plugin-service answer failed the schema check');
      throw new Error('plugin resolve answer was malformed');
    }
    const { limits } = parsed.data;
    return {
      tools: parsed.data.tools,
      systemBlock: parsed.data.systemBlock,
      limits: {
        maxRounds: Math.min(limits.maxRounds ?? PLUGIN_DEFAULT_MAX_ROUNDS, PLUGIN_HARD_MAX_ROUNDS),
        maxCallsPerTurn: Math.min(
          limits.maxCallsPerTurn ?? PLUGIN_DEFAULT_MAX_CALLS_PER_TURN,
          PLUGIN_HARD_MAX_CALLS_PER_TURN,
        ),
        timeoutMs: limits.timeoutMs ?? PLUGIN_INVOKE_TIMEOUT_MS,
      },
      notices: parsed.data.notices.flatMap((notice) =>
        isNoticeCode(notice.code) ? [{ code: notice.code, pluginSlug: notice.pluginSlug }] : [],
      ),
    };
  }

  async invoke(request: PluginInvokeRequest): Promise<PluginInvokeResult> {
    const response = await httpRequest<unknown>({
      url: `${AppConfig.get().PLUGIN_SERVICE_URL}${PLUGIN_INVOKE_PATH}`,
      method: HttpMethod.POST,
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: toInvokeBody(request),
      timeoutMs: PLUGIN_INVOKE_TIMEOUT_MS,
    });
    const parsed = invokeResponseSchema.safeParse(response.data);
    if (parsed.success) {
      const { status, content, truncated, durationMs, errorCode } = parsed.data;
      return {
        status,
        truncated,
        durationMs,
        ...(content === null || content === undefined ? {} : { content }),
        ...(errorCode === null || errorCode === undefined ? {} : { errorCode }),
      };
    }
    // A non-2xx without a status is the service refusing the call (plan, quota, duplicate) or failing.
    this.logger.warn(`invoke: plugin-service answered ${String(response.status)} without a status`);
    const refusal = errorBodySchema.safeParse(response.data);
    return {
      status: PluginInvokeStatus.ERROR,
      truncated: false,
      durationMs: 0,
      errorCode: refusal.success ? refusal.data.errorCode : 'PLUGIN_SERVICE_ERROR',
    };
  }
}
