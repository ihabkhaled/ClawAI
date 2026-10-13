import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import { type ContextSaveChoiceDto, contextSaveChoiceSchema } from '../dto/context-save-choice.dto';
import {
  type SaveMessageToContextDto,
  saveMessageToContextSchema,
} from '../dto/save-message-to-context.dto';
import {
  type ContextSaveProposalConfirmDto,
  contextSaveProposalConfirmSchema,
} from '../dto/context-save-proposal-confirm.dto';
import { ContextSaveChoiceService } from '../services/context-save-choice.service';
import { ContextSaveProposalService } from '../services/context-save-proposal.service';
import { MessageSaveToContextService } from '../services/message-save-to-context.service';
import type { ContextSaveRecord } from '../types/context-save.types';

/** The "which pack?" card's answer (ADR-134) and the one-click save on a message. */
@Controller('chat-messages')
export class ContextSaveController {
  constructor(
    private readonly contextSaveChoiceService: ContextSaveChoiceService,
    private readonly contextSaveProposalService: ContextSaveProposalService,
    private readonly messageSaveToContextService: MessageSaveToContextService,
  ) {}

  @Post(':id/context-save')
  @HttpCode(HttpStatus.OK)
  async choose(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(contextSaveChoiceSchema)) dto: ContextSaveChoiceDto,
  ): Promise<ContextSaveRecord> {
    return this.contextSaveChoiceService.choose(user.id, id, dto);
  }

  /** Confirms a proposed save with the user's (possibly edited) form (ADR-168). */
  @Post(':id/context-save/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(contextSaveProposalConfirmSchema))
    dto: ContextSaveProposalConfirmDto,
  ): Promise<ContextSaveRecord> {
    return this.contextSaveProposalService.confirm(user.id, id, dto);
  }

  /** Dismisses a proposed save; idempotent (ADR-168). */
  @Post(':id/context-save/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismiss(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContextSaveRecord> {
    return this.contextSaveProposalService.dismiss(user.id, id);
  }

  /** One-click "Save as context pack / Save to memory" on a message. */
  @Post(':id/save-to-context')
  @HttpCode(HttpStatus.OK)
  async saveToContext(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(saveMessageToContextSchema)) dto: SaveMessageToContextDto,
  ): Promise<ContextSaveRecord> {
    return this.messageSaveToContextService.save(user.id, id, dto);
  }
}
