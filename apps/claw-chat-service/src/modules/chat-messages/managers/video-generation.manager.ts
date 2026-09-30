import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { readVideoRequestOptions } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import { IMAGE_GENERATION_PLAN_FEATURE } from '../constants/plan-feature-refusal.constants';
import {
  VIDEO_PLAN_REFUSAL_TEXT,
  VIDEO_PLANNER_MAX_OUTPUT_TOKENS,
  VIDEO_SERVICE_TIMEOUT_MS,
} from '../constants/video-generation.constants';
import { AccessControlService } from '../services/access-control.service';
import { ResearchGateService } from '../services/research-gate.service';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse } from '../types/execution.types';
import type { VideoGenerateRequest, VideoGenerateResponse } from '../types/video-generation.types';
import { isPlanFeatureDisabledResponse } from '../utilities/plan-feature-refusal.utility';
import { latestUserTurnText } from '../utilities/quoted-turn.utility';
import {
  boundVideoPrompt,
  buildVideoPlannerPrompt,
  parsePlannedVideoPrompt,
} from '../utilities/video-prompt.utility';

/**
 * Turns a chat request into a video generation (ADR-137).
 *
 * "Smart" in the same sense image generation is, and one step further: a planner
 * model rewrites the user's words into a focused shot description using the recent
 * conversation, any page facts research produced, and (for a request about the app
 * itself) the platform background. If no planner answers, the user's own words go
 * through unchanged, so a planner outage never blocks a video. The provider work,
 * PAYG hold and storage all live in image-service; this only dispatches and returns
 * the generation id the message card polls.
 */
@Injectable()
export class VideoGenerationManager {
  private readonly logger = new Logger(VideoGenerationManager.name);

  constructor(
    private readonly accessControl: AccessControlService,
    private readonly planner: ResearchGateService,
  ) {}

  async generate(input: {
    provider: string;
    model: string;
    context: AssembledContext;
    startTime: number;
    usedFallback: boolean;
    userId: string;
    isAutoMode: boolean;
  }): Promise<LlmResponse> {
    const { provider, model, context, startTime, usedFallback, userId, isAutoMode } = input;
    // Before the planner hop and before image-service, so a plan without media
    // generation spends nothing and hears why in a sentence, not an error.
    if (!(await this.accessControl.hasPlanFeatureFor(userId, IMAGE_GENERATION_PLAN_FEATURE))) {
      this.logger.warn(`generate: video generation not on plan user=${userId}`);
      return this.refusal(provider, model, startTime, usedFallback);
    }
    const originalPrompt = latestUserTurnText(context.threadMessages) ?? 'a short video';
    const prompt = await this.planPrompt(originalPrompt, context);
    const options = readVideoRequestOptions(originalPrompt);
    const lastUser = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    const body: VideoGenerateRequest = {
      prompt,
      provider,
      model,
      userId,
      isAutoMode,
      durationSeconds: options.durationSeconds,
      aspectRatio: options.aspectRatio,
      threadId: lastUser?.threadId,
      userMessageId: lastUser?.id,
      ...(prompt === boundVideoPrompt(originalPrompt)
        ? {}
        : { originalPrompt: boundVideoPrompt(originalPrompt) }),
    };
    const config = AppConfig.get();
    const response = await httpRequest<VideoGenerateResponse>({
      url: `${config.IMAGE_SERVICE_URL}/api/v1/internal/videos/generate`,
      method: 'POST',
      headers: { Authorization: buildInterServiceAuthHeader() },
      body,
      timeoutMs: VIDEO_SERVICE_TIMEOUT_MS,
    });
    if (isPlanFeatureDisabledResponse(response.status, response.data)) {
      // The plan changed between the check above and image-service's own gate.
      return this.refusal(provider, model, startTime, usedFallback);
    }
    if (!response.ok) {
      this.logger.error(`generate: image-service returned status=${String(response.status)}`);
      throw new BusinessException(
        `Video service returned status ${String(response.status)}`,
        'VIDEO_SERVICE_REQUEST_FAILED',
        response.status === Number(HttpStatus.PAYMENT_REQUIRED)
          ? HttpStatus.PAYMENT_REQUIRED
          : HttpStatus.BAD_GATEWAY,
      );
    }
    this.logger.log(
      `generate: dispatched generationId=${response.data.generationId} provider=${provider} model=${model} seconds=${String(options.durationSeconds)}`,
    );
    return {
      content: 'Generating video…',
      provider,
      model,
      latencyMs: Date.now() - startTime,
      finishReason: 'stop',
      usedFallback,
      videoGenerationId: response.data.generationId,
    };
  }

  /** The planner's shot description, or the user's own words when none answers. */
  private async planPrompt(userText: string, context: AssembledContext): Promise<string> {
    const planned = await this.planner.askPlanner(
      buildVideoPlannerPrompt(userText, context),
      VIDEO_PLANNER_MAX_OUTPUT_TOKENS,
      parsePlannedVideoPrompt,
    );
    if (planned === null) {
      this.logger.warn('planPrompt: no planner answer, using the user words');
      return boundVideoPrompt(userText);
    }
    return boundVideoPrompt(planned);
  }

  private refusal(
    provider: string,
    model: string,
    startTime: number,
    usedFallback: boolean,
  ): LlmResponse {
    return {
      content: VIDEO_PLAN_REFUSAL_TEXT,
      provider,
      model,
      latencyMs: Date.now() - startTime,
      finishReason: 'stop',
      usedFallback,
    };
  }
}
