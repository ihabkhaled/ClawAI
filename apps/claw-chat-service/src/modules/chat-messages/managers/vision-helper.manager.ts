import { randomUUID } from 'node:crypto';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { PaygHold } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { estimateTextTokens } from '@claw/shared-utilities';

import { HelperExecutionKind } from '../../../common/enums/helper-execution-kind.enum';
import { MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';
import { VisionHelperOutcome } from '../../../common/enums/vision-helper-outcome.enum';
import { BusinessException } from '../../../common/errors';
import { MessageRole } from '../../../generated/prisma';
import { ModelCapabilityClient } from '../clients/model-capability.client';
import { VisionHelperCandidatesClient } from '../clients/vision-helper-candidates.client';
import { PAYG_WORKFLOW_VISION_HELPER } from '../constants/payg.constants';
import { HELPER_VISION_PLAN_FEATURE } from '../constants/plan-feature-refusal.constants';
import {
  VISION_HELPER_IMAGE_PROMPT_TOKENS,
  VISION_HELPER_MAX_IMAGES_PER_TURN,
  VISION_HELPER_RESULT_CACHE_MAX_ENTRIES,
  VISION_HELPER_RESULT_TTL_MS,
  VISION_HELPER_SYSTEM_PROMPT,
  VISION_HELPER_USER_PROMPT,
} from '../constants/vision-helper.constants';
import { AccessControlService } from '../services/access-control.service';
import type { AssembledContext, FileContentResponse } from '../types/context.types';
import type {
  VisionHelperAttemptInput,
  VisionHelperAttemptResult,
  VisionHelperCacheEntry,
  VisionHelperCandidate,
  VisionHelperInvoker,
  VisionHelperResult,
} from '../types/vision-helper.types';
import { raceDeadline } from '../utilities/deadline.utility';
import { normalizePaygProvider } from '../utilities/payg-metering.utility';
import {
  applyVisionHelperResults,
  blindImageDecisions,
  fitLaneFileShare,
  isImageRejectionError,
  markHelperVisionNotOnPlan,
  toVisionHelperCandidates,
  visionHelperRequestId,
} from '../utilities/vision-helper.utility';

/**
 * Helper vision (ADR-120 batch 5). When a lane's model cannot see and an image
 * is attached, the admin's VISION_HELPER model describes the image and the lane
 * receives DERIVED OBSERVATIONS instead of the bare OCR note. The lane's own
 * model stays the conversational model; the helper is never substituted for it.
 *
 * Metering: this manager RESERVES (`PaygSurface.VISION_HELPER`) and hands the
 * hold to the execution chokepoint (`callProvider`), which sends
 * `hold.maxOutputTokens`, finalizes on measured usage and releases on a throw.
 *
 * One description per (user, turn, image): every compare lane, the judge and
 * the critic of the turn share it — one paid call, one hold. A credit refusal
 * or a timeout ends the candidate walk; a failure or an image rejection
 * released its hold and moves to the next candidate under a distinct key.
 */
@Injectable()
export class VisionHelperManager {
  private readonly logger = new Logger(VisionHelperManager.name);
  private readonly results = new Map<string, VisionHelperCacheEntry>();

  constructor(
    private readonly candidatesClient: VisionHelperCandidatesClient,
    private readonly capabilities: ModelCapabilityClient,
    private readonly accessControl: AccessControlService,
  ) {}

  /** The lane's context with its blind images described, or unchanged when there is nothing to do. */
  async upgradeContext(
    context: AssembledContext,
    invoke: VisionHelperInvoker,
  ): Promise<AssembledContext> {
    const plan = context.attachmentDelivery;
    if (
      plan === undefined ||
      plan.derivedImages !== undefined ||
      context.visionHelperCall === true ||
      context.userId.length === 0
    ) {
      return context;
    }
    const blind = blindImageDecisions(plan);
    if (blind.length === 0) {
      return context;
    }
    // Paid feature (ADR-122). Checked here, low in the turn, so a free plan's
    // ordinary chat is never refused — it simply keeps OCR + the honest note,
    // with no paid call and no hold.
    const onPlan = await this.helperVisionOnPlan(context.userId);
    if (onPlan !== true) {
      return onPlan === false
        ? { ...context, attachmentDelivery: markHelperVisionNotOnPlan(plan) }
        : context;
    }
    const candidates = await this.eligibleCandidates(context);
    if (candidates.length === 0) {
      // No helper configured or reachable: today's OCR + honest note.
      return context;
    }
    const described = blind.slice(0, VISION_HELPER_MAX_IMAGES_PER_TURN);
    const turnKey = context.turnId ?? randomUUID();
    const results = await Promise.all(
      described.map(async (decision) =>
        this.describeOnce(context, turnKey, decision.fileId, candidates, invoke),
      ),
    );
    const fit = fitLaneFileShare(
      context,
      results.flatMap((result) => (result.observation === undefined ? [] : [result.observation])),
    );
    return {
      ...context,
      fileContents: fit.fileContents,
      attachmentDelivery: applyVisionHelperResults(
        plan,
        results,
        blind.slice(VISION_HELPER_MAX_IMAGES_PER_TURN).map((decision) => decision.fileId),
        fit.derivedImages,
      ),
    };
  }

  /**
   * Whether the plan includes helper vision; null when entitlements could not
   * be read. Null fails closed to the free path (no helper, no hold) without
   * labelling the image "not on your plan" — an outage is not the plan's doing
   * — and without breaking the turn.
   */
  private async helperVisionOnPlan(userId: string): Promise<boolean | null> {
    try {
      return await this.accessControl.hasPlanFeatureFor(userId, HELPER_VISION_PLAN_FEATURE);
    } catch (error: unknown) {
      this.logger.warn(
        `helperVisionOnPlan: entitlements unavailable, skipping helper user=${userId} — ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /** Admin candidates the catalog says can SEE, local-only when the turn requires it. */
  private async eligibleCandidates(context: AssembledContext): Promise<VisionHelperCandidate[]> {
    const wire = await this.candidatesClient.resolve();
    const mapped = toVisionHelperCandidates(wire, context.mediaLocalOnly === true);
    const checked = await Promise.all(
      mapped.map(async (candidate) => {
        const capabilities = await this.capabilities.resolve(candidate.provider, candidate.model);
        return capabilities.vision === MediaCapabilityState.SUPPORTED ? candidate : null;
      }),
    );
    return checked.filter((candidate): candidate is VisionHelperCandidate => candidate !== null);
  }

  /** The turn's one description of this image, computed on first use. */
  private async describeOnce(
    context: AssembledContext,
    turnKey: string,
    fileId: string,
    candidates: readonly VisionHelperCandidate[],
    invoke: VisionHelperInvoker,
  ): Promise<VisionHelperResult> {
    const now = Date.now();
    this.evict(now);
    const key = `${context.userId}:${turnKey}:${fileId}`;
    const hit = this.results.get(key);
    if (hit !== undefined) {
      return hit.result;
    }
    const result = this.walk(context, turnKey, fileId, candidates, invoke).catch(
      (): VisionHelperResult => ({ fileId, outcome: VisionHelperOutcome.FAILED, executions: [] }),
    );
    this.results.set(key, { result, expiresAt: now + VISION_HELPER_RESULT_TTL_MS });
    return result;
  }

  private async walk(
    context: AssembledContext,
    turnKey: string,
    fileId: string,
    candidates: readonly VisionHelperCandidate[],
    invoke: VisionHelperInvoker,
  ): Promise<VisionHelperResult> {
    const file = context.fileContents.find((candidate) => candidate.id === fileId);
    const imageContext = file === undefined ? null : this.helperContext(context, file);
    const executions: VisionHelperResult['executions'] = [];
    if (file === undefined || imageContext === null) {
      return { fileId, outcome: VisionHelperOutcome.FAILED, executions };
    }
    for (const [index, candidate] of candidates.entries()) {
      const attempt = await this.attempt({
        context,
        imageContext,
        fileId,
        candidate,
        requestId: visionHelperRequestId(turnKey, fileId, index),
        invoke,
      });
      executions.push(attempt.execution);
      if (attempt.outcome === VisionHelperOutcome.SUCCEEDED && attempt.text !== undefined) {
        const observation = {
          fileId,
          filename: file.filename,
          helperProvider: candidate.provider,
          helperModel: candidate.model,
          text: attempt.text,
        };
        return { fileId, outcome: attempt.outcome, observation, executions };
      }
      if (
        attempt.outcome === VisionHelperOutcome.REFUSED ||
        attempt.outcome === VisionHelperOutcome.TIMED_OUT
      ) {
        return { fileId, outcome: attempt.outcome, executions };
      }
    }
    return {
      fileId,
      outcome: executions.at(-1)?.outcome ?? VisionHelperOutcome.FAILED,
      executions,
    };
  }

  /** reserve → call through the chokepoint (which finalizes / releases) → classify. */
  private async attempt(input: VisionHelperAttemptInput): Promise<VisionHelperAttemptResult> {
    const started = Date.now();
    const hold = await this.reserve(input);
    if (hold === null) {
      return this.finish(input, started, VisionHelperOutcome.REFUSED);
    }
    if (hold.clamped) {
      // A shortened description of an image reads as the image having less in
      // it. Treated as a refusal (rule 37 item 18), and the money goes back.
      await this.accessControl.releaseCredit(hold, 'CANCELLED');
      return this.finish(input, started, VisionHelperOutcome.REFUSED);
    }
    try {
      const raced = await raceDeadline(
        input.invoke({
          provider: input.candidate.provider,
          model: input.candidate.model,
          context: input.imageContext,
          hold,
          requestId: input.requestId,
        }),
        input.candidate.timeoutMs,
      );
      if (raced.timedOut) {
        return this.finish(input, started, VisionHelperOutcome.TIMED_OUT);
      }
      const text = raced.value.content.trim();
      return text.length > 0
        ? this.finish(input, started, VisionHelperOutcome.SUCCEEDED, text)
        : this.finish(input, started, VisionHelperOutcome.FAILED);
    } catch (error: unknown) {
      return this.finish(input, started, this.classifyFailure(error));
    }
  }

  /** The hold, or null when the meter refused or could not be asked (fails closed). */
  private async reserve(input: VisionHelperAttemptInput): Promise<PaygHold | null> {
    try {
      return await this.accessControl.reserveCredit({
        userId: input.context.userId,
        requestId: input.requestId,
        provider: normalizePaygProvider(input.candidate.provider),
        model: input.candidate.model,
        surface: PaygSurface.VISION_HELPER,
        workflow: PAYG_WORKFLOW_VISION_HELPER,
        promptTokens:
          estimateTextTokens(VISION_HELPER_SYSTEM_PROMPT) + VISION_HELPER_IMAGE_PROMPT_TOKENS,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: input.candidate.maxTokens,
      });
    } catch (error: unknown) {
      this.logger.warn(`reserve: vision helper hold refused — ${(error as Error).message}`);
      return null;
    }
  }

  private classifyFailure(error: unknown): VisionHelperOutcome {
    if (error instanceof BusinessException && error.getStatus() === HttpStatus.PAYMENT_REQUIRED) {
      return VisionHelperOutcome.REFUSED;
    }
    return isImageRejectionError(error)
      ? VisionHelperOutcome.REJECTED_IMAGE
      : VisionHelperOutcome.FAILED;
  }

  /** Records and logs one attempt. Content-free: no image, no observations. */
  private finish(
    input: VisionHelperAttemptInput,
    started: number,
    outcome: VisionHelperOutcome,
    text?: string,
  ): VisionHelperAttemptResult {
    const execution = {
      kind: HelperExecutionKind.VISION,
      provider: input.candidate.provider,
      model: input.candidate.model,
      fileId: input.fileId,
      latencyMs: Date.now() - started,
      outcome,
    };
    this.logger.log(`visionHelper ${JSON.stringify(execution)}`);
    return text === undefined ? { outcome, execution } : { outcome, text, execution };
  }

  /**
   * The helper's own call: the fixed instruction, one user turn and ONLY this
   * image. No memories, packs, research or history — the helper describes, it
   * never answers, and nothing of the conversation reaches a second provider.
   */
  private helperContext(
    context: AssembledContext,
    file: FileContentResponse,
  ): AssembledContext | null {
    const template = context.threadMessages.at(-1);
    if (template === undefined) {
      return null;
    }
    const { attachmentDelivery: _plan, toolTurns: _turns, ...base } = context;
    return {
      ...base,
      systemPrompt: VISION_HELPER_SYSTEM_PROMPT,
      threadMessages: [
        {
          ...template,
          id: `vision-helper-${file.id}`,
          role: MessageRole.USER,
          content: VISION_HELPER_USER_PROMPT.replace('{FILENAME}', file.filename),
          metadata: null,
        },
      ],
      memories: [],
      contextPackItems: [],
      fileContents: [file],
      workspaceCitations: [],
      researchEvidence: [],
      researchRunId: null,
      researchWarnings: [],
      researchRequested: false,
      researchToolsUsed: [],
      researchGroundingInjected: false,
      crossThread: {
        ...context.crossThread,
        selections: [],
        usedThreadIds: [],
        estimatedTokens: 0,
      },
      visionHelperCall: true,
    };
  }

  private evict(now: number): void {
    for (const [key, entry] of this.results) {
      if (entry.expiresAt <= now || this.results.size > VISION_HELPER_RESULT_CACHE_MAX_ENTRIES) {
        this.results.delete(key);
      }
    }
  }
}
