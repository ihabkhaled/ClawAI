import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import { type ContextSaveChoiceDto, contextSaveChoiceSchema } from '../dto/context-save-choice.dto';
import { ContextSaveChoiceService } from '../services/context-save-choice.service';
import type { ContextSaveRecord } from '../types/context-save.types';

/** The "which pack?" card's answer (ADR-134). */
@Controller('chat-messages')
export class ContextSaveController {
  constructor(private readonly contextSaveChoiceService: ContextSaveChoiceService) {}

  @Post(':id/context-save')
  @HttpCode(HttpStatus.OK)
  async choose(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(contextSaveChoiceSchema)) dto: ContextSaveChoiceDto,
  ): Promise<ContextSaveRecord> {
    return this.contextSaveChoiceService.choose(user.id, id, dto);
  }
}
