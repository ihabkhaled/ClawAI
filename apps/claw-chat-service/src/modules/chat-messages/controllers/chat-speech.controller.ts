import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type MessageSpeechParamsDto,
  messageSpeechParamsSchema,
} from '../dto/message-speech-params.dto';
import { MessageSpeechService } from '../services/message-speech.service';
import type { MessageSpeechResponse, SpeechAvailability } from '../types/speech.types';

/**
 * "Read aloud" (text-to-speech, multimodal batch 9). JWT like every
 * chat-messages route; ownership, plan gate and metering live in the service.
 */
@Controller('chat-messages')
export class ChatSpeechController {
  constructor(private readonly speech: MessageSpeechService) {}

  @Get('speech/availability')
  async availability(@CurrentUser() user: AuthenticatedUser): Promise<SpeechAvailability> {
    return this.speech.getAvailability(user.id);
  }

  @Post(':id/speech')
  @HttpCode(HttpStatus.OK)
  async synthesize(
    @Param(new ZodValidationPipe(messageSpeechParamsSchema)) params: MessageSpeechParamsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MessageSpeechResponse> {
    return this.speech.synthesize(user.id, params.id);
  }
}
