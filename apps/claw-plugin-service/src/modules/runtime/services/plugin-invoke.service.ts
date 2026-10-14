import { ConflictException, Injectable } from '@nestjs/common';

import { BreakerDecision } from '../../../common/enums/breaker-decision.enum';
import { ConsentDecision } from '../../../common/enums/consent-decision.enum';
import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import { InvokeOutcome } from '../../../common/enums/invoke-outcome.enum';
import { QuotaSettlement } from '../../../common/enums/quota-settlement.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { TargetKind } from '../../../common/enums/target-kind.enum';
import { McpServerHealthManager } from '../../mcp-servers/managers/mcp-server-health.manager';
import { RuntimeSettingsManager } from '../../runtime-settings/managers/runtime-settings.manager';
import { type RuntimeSettings } from '../../runtime-settings/types/runtime-settings.types';
import { NATIVE_TOOL_PREFIX, TOOL_TIMEOUT_MAX_MS } from '../../catalog/constants/catalog.constants';
import { type InvokeBody } from '../dto/invoke.dto';
import { BuiltinExecutorManager } from '../managers/builtin-executor.manager';
import { CallLimiterManager } from '../managers/call-limiter.manager';
import { ConsentGateManager } from '../managers/consent-gate.manager';
import { InvocationAuditManager } from '../managers/invocation-audit.manager';
import { InvokeTargetManager } from '../managers/invoke-target.manager';
import { McpExecutorManager } from '../managers/mcp-executor.manager';
import { PluginCallsQuotaManager } from '../managers/plugin-calls-quota.manager';
import { RuntimePlanGateManager } from '../managers/runtime-plan-gate.manager';
import { ToolArgumentsManager } from '../managers/tool-arguments.manager';
import {
  type CallContext,
  type ExecutionContext,
  type ExecutionResult,
  type InvokeResponse,
  type InvokeTarget,
  type QuotaDetail,
} from '../types/invoke.types';
import { buildArgsPreview, hashArguments } from '../utilities/build-args-preview.utility';
import { fenceToolResult } from '../utilities/fence-tool-result.utility';
import { HARD_TIMEOUT_GRACE_MS } from '../constants/runtime.constants';

/**
 * POST /plugins/invoke. One call, in this order, and each step can end it:
 *
 *  1. duplicate call id (same user) -> 409
 *  2. the target is the caller's and has the tool -> else 404 (same answer for "not yours")
 *  3. the plan allows plugins -> else 403, or 503 when the plan cannot be read (fail closed)
 *  4. arguments valid against the tool's schema -> else 400
 *  5. target switched off / withdrawn / awaiting review -> BLOCKED
 *  6. consent: READ never asks; WRITE asks until granted; DESTRUCTIVE every call; a tainted turn
 *     asks for every non-READ call -> CONSENT_REQUIRED (no quota held, no audit row, so the same
 *     call id can be sent again once the user said yes)
 *  7. per-user rate and concurrency -> RATE_LIMITED
 *  8. server circuit breaker -> BLOCKED
 *  9. hold one PLUGIN_CALLS run with auth-service -> QUOTA_EXCEEDED (idempotent per call id)
 * 10. run under a deadline and a result cap; settle the hold (consume on OK, release otherwise)
 * 11. fence the result as untrusted data, write the audit row (no payloads), answer
 */
@Injectable()
export class PluginInvokeService {
  private readonly inFlightCalls = new Set<string>();

  constructor(
    private readonly targets: InvokeTargetManager,
    private readonly planGate: RuntimePlanGateManager,
    private readonly argumentsManager: ToolArgumentsManager,
    private readonly consent: ConsentGateManager,
    private readonly settings: RuntimeSettingsManager,
    private readonly limiter: CallLimiterManager,
    private readonly quota: PluginCallsQuotaManager,
    private readonly builtin: BuiltinExecutorManager,
    private readonly mcp: McpExecutorManager,
    private readonly health: McpServerHealthManager,
    private readonly audit: InvocationAuditManager,
  ) {}

  async invoke(userId: string, body: InvokeBody, signal: AbortSignal): Promise<InvokeResponse> {
    const key = `${userId}:${body.callId}`;
    if (this.inFlightCalls.has(key)) throw this.duplicate();
    this.inFlightCalls.add(key);
    try {
      if (await this.audit.alreadyRecorded(userId, body.callId)) throw this.duplicate();
      return await this.run(userId, body, signal);
    } finally {
      this.inFlightCalls.delete(key);
    }
  }

  private async run(
    userId: string,
    body: InvokeBody,
    signal: AbortSignal,
  ): Promise<InvokeResponse> {
    const started = Date.now();
    const { target, blocked } = await this.targets.resolve(userId, body);
    await this.planGate.assertAllowed(userId);
    const args = this.argumentsManager.prepare(target.inputSchema, body.args);
    const context: CallContext = {
      userId,
      callId: body.callId,
      surface: body.surface,
      conversationId: body.conversationId,
      messageId: body.messageId,
      tainted: body.tainted,
      target,
      argsHash: hashArguments(args),
      started,
    };
    if (blocked !== null) {
      return this.refuse(context, InvokeOutcome.BLOCKED, blocked, ConsentDecision.NOT_REQUIRED);
    }
    const verdict = this.consent.decide({
      riskLevel: target.riskLevel,
      consentGranted: target.consentGranted,
      tainted: body.tainted,
      userApproved: body.userApproved,
    });
    return verdict.required
      ? this.askConsent(context, verdict.decision, args)
      : this.admitted(context, args, verdict.decision, signal);
  }

  private async admitted(
    context: CallContext,
    args: Record<string, unknown>,
    decision: ConsentDecision,
    signal: AbortSignal,
  ): Promise<InvokeResponse> {
    const settings = await this.settings.load();
    const slot = await this.limiter.acquire(context.userId, {
      ratePerMinute: settings.ratePerMinute,
      concurrentPerUser: settings.concurrentPerUser,
    });
    if (!slot.ok) return this.refuse(context, InvokeOutcome.RATE_LIMITED, slot.errorCode, decision);
    try {
      return await this.guarded(context, args, decision, settings, signal);
    } finally {
      slot.release();
    }
  }

  private async guarded(
    context: CallContext,
    args: Record<string, unknown>,
    decision: ConsentDecision,
    settings: RuntimeSettings,
    signal: AbortSignal,
  ): Promise<InvokeResponse> {
    if ((await this.admitServer(context.target)) === BreakerDecision.OPEN) {
      return this.refuse(context, InvokeOutcome.BLOCKED, InvokeErrorCode.BREAKER_OPEN, decision);
    }
    const hold = await this.quota.reserve(context.userId, context.callId);
    if (!hold.allowed) {
      return this.refuse(
        context,
        InvokeOutcome.QUOTA_EXCEEDED,
        hold.errorCode,
        decision,
        hold.detail,
      );
    }
    const result = await this.execute(context, args, settings, signal);
    if (hold.reservationId !== null) {
      await this.quota.settle(
        hold.reservationId,
        result.outcome === InvokeOutcome.OK ? QuotaSettlement.CONSUME : QuotaSettlement.RELEASE,
      );
    }
    await this.recordHealth(context.target, result);
    return this.finish(context, result, decision, settings);
  }

  /** Runs the tool. Never throws: whatever happens becomes a result, so the hold is always settled. */
  private async execute(
    context: CallContext,
    args: Record<string, unknown>,
    settings: RuntimeSettings,
    signal: AbortSignal,
  ): Promise<ExecutionResult> {
    const target = context.target;
    const timeoutMs = Math.min(target.timeoutMs ?? settings.callTimeoutMs, TOOL_TIMEOUT_MAX_MS);
    const controller = new AbortController();
    const state = { timedOut: false };
    const onAbort = (): void => {
      controller.abort();
    };
    signal.addEventListener('abort', onAbort, { once: true });
    let hardTimer: NodeJS.Timeout | undefined;
    const deadline = new Promise<ExecutionResult>((resolve) => {
      hardTimer = setTimeout(() => {
        state.timedOut = true;
        controller.abort();
        resolve(this.timedOut());
      }, timeoutMs + HARD_TIMEOUT_GRACE_MS);
    });
    const executionContext: ExecutionContext = {
      userId: context.userId,
      signal: controller.signal,
      timeoutMs,
      maxResultBytes: this.resultCap(target, settings),
    };
    try {
      const result = await Promise.race([this.dispatch(target, args, executionContext), deadline]);
      return state.timedOut ? this.timedOut() : result;
    } catch {
      return this.unexpected();
    } finally {
      clearTimeout(hardTimer);
      signal.removeEventListener('abort', onAbort);
    }
  }

  private dispatch(
    target: InvokeTarget,
    args: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    return target.kind === TargetKind.CATALOG && target.runtimeKind === RuntimeKind.BUILTIN
      ? this.builtin.execute(target, args, context)
      : this.mcp.execute(target, args, context);
  }

  private async admitServer(target: InvokeTarget): Promise<BreakerDecision> {
    if (target.kind !== TargetKind.SERVER || target.serverId === null) return BreakerDecision.ALLOW;
    return this.health.admit({
      id: target.serverId,
      failureCount: target.failureCount,
      breakerOpenedAt: target.breakerOpenedAt,
    });
  }

  private async recordHealth(target: InvokeTarget, result: ExecutionResult): Promise<void> {
    if (target.kind !== TargetKind.SERVER || target.serverId === null) return;
    if (result.serverFault) {
      await this.health.failed(target.serverId, result.errorCode ?? InvokeErrorCode.TOOL_FAILED);
    } else if (
      result.outcome === InvokeOutcome.OK ||
      result.errorCode === InvokeErrorCode.TOOL_FAILED
    ) {
      await this.health.succeeded(target.serverId);
    }
  }

  private async finish(
    context: CallContext,
    result: ExecutionResult,
    decision: ConsentDecision,
    settings: RuntimeSettings,
  ): Promise<InvokeResponse> {
    const fenced = fenceToolResult({
      slug: context.target.slug,
      toolName: context.target.toolName,
      text: result.text,
      maxBytes: this.resultCap(context.target, settings),
      alreadyTruncated: result.truncated,
    });
    const durationMs = Date.now() - context.started;
    await this.audit.record({
      userId: context.userId,
      target: context.target,
      callId: context.callId,
      surface: context.surface,
      conversationId: context.conversationId,
      messageId: context.messageId,
      status: result.outcome,
      consentDecision: decision,
      tainted: context.tainted,
      argsHash: context.argsHash,
      resultBytes: fenced.bytes,
      truncated: fenced.truncated,
      errorCode: result.errorCode,
      durationMs,
    });
    return this.response(context, result.outcome, {
      content: fenced.content,
      truncated: fenced.truncated,
      errorCode: result.errorCode,
      durationMs,
    });
  }

  private async refuse(
    context: CallContext,
    outcome: InvokeOutcome,
    errorCode: InvokeErrorCode,
    decision: ConsentDecision,
    quota: QuotaDetail | null = null,
  ): Promise<InvokeResponse> {
    const durationMs = Date.now() - context.started;
    await this.audit.record({
      userId: context.userId,
      target: context.target,
      callId: context.callId,
      surface: context.surface,
      conversationId: context.conversationId,
      messageId: context.messageId,
      status: outcome,
      consentDecision: decision,
      tainted: context.tainted,
      argsHash: context.argsHash,
      resultBytes: null,
      truncated: false,
      errorCode,
      durationMs,
    });
    return this.response(context, outcome, {
      content: null,
      truncated: false,
      errorCode,
      durationMs,
      quota,
    });
  }

  /** A question, not a result: nothing is held, nothing is audited, the same call id can be sent again. */
  private askConsent(
    context: CallContext,
    reason: ConsentDecision,
    args: Record<string, unknown>,
  ): InvokeResponse {
    return this.response(context, InvokeOutcome.CONSENT_REQUIRED, {
      content: null,
      truncated: false,
      errorCode: null,
      durationMs: Date.now() - context.started,
      consent: { reason, argsHash: context.argsHash, argsPreview: buildArgsPreview(args) },
    });
  }

  private response(
    context: CallContext,
    status: InvokeOutcome,
    parts: {
      content: string | null;
      truncated: boolean;
      errorCode: string | null;
      durationMs: number;
      quota?: QuotaDetail | null;
      consent?: InvokeResponse['consent'];
    },
  ): InvokeResponse {
    return {
      callId: context.callId,
      status,
      content: parts.content,
      truncated: parts.truncated,
      untrusted: true,
      durationMs: parts.durationMs,
      riskLevel: context.target.riskLevel,
      nativeName: `${NATIVE_TOOL_PREFIX}_${context.target.slug}_${context.target.toolName}`,
      errorCode: parts.errorCode,
      consent: parts.consent ?? null,
      quota: parts.quota ?? null,
    };
  }

  private resultCap(target: InvokeTarget, settings: RuntimeSettings): number {
    return Math.min(target.maxResultBytes ?? settings.maxResultBytes, settings.maxResultBytes);
  }

  private timedOut(): ExecutionResult {
    return {
      outcome: InvokeOutcome.TIMEOUT,
      text: 'The tool took too long and was stopped.',
      errorCode: InvokeErrorCode.TIMED_OUT,
      serverFault: true,
      truncated: false,
    };
  }

  private unexpected(): ExecutionResult {
    return {
      outcome: InvokeOutcome.ERROR,
      text: 'The tool failed.',
      errorCode: InvokeErrorCode.ADAPTER_FAILED,
      serverFault: false,
      truncated: false,
    };
  }

  private duplicate(): ConflictException {
    return new ConflictException({
      message: 'This call id was already used',
      errorCode: InvokeErrorCode.CALL_DUPLICATE,
    });
  }
}
