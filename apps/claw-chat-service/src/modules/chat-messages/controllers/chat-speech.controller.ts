import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { type Response } from 'express';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type MessageSpeechParamsDto,
  messageSpeechParamsSchema,
} from '../dto/message-speech-params.dto';
import { MessageSpeechService } from '../services/message-speech.service';
import type { MessageSpeechStateResponse, SpeechAvailability } from '../types/speech.types';

/**
 * "Read aloud" (text-to-speech, multimodal batch 9; progressive since
 * 2026-09-25). JWT like every chat-messages route; ownership, plan gate,
 * the job lock and metering live in the service. POST answers 200 when the
 * reading is READY and 202 while a background job synthesises it; GET is the
 * poll. Neither ever waits on a provider.
 */
@Controller('chat-messages')
export class ChatSpeechController {
  constructor(private readonly speech: MessageSpeechService) {}

  @Get('speech/availability')
  async availability(@CurrentUser() user: AuthenticatedUser): Promise<SpeechAvailability> {
    return this.speech.getAvailability(user.id);
  }

  @Post(':id/speech')
  async start(
    @Param(new ZodValidationPipe(messageSpeechParamsSchema)) params: MessageSpeechParamsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageSpeechStateResponse> {
    const result = await this.speech.start(user.id, params.id);
    response.status(result.httpStatus);
    return result.body;
  }

  @Get(':id/speech')
  async state(
    @Param(new ZodValidationPipe(messageSpeechParamsSchema)) params: MessageSpeechParamsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MessageSpeechStateResponse> {
    return this.speech.getState(user.id, params.id);
  }
}
