import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ChatPacksBundle,
  type ContextPackWithItems,
  type SavePackFromChatResult,
} from '../types/context-packs.types';
import { ContextPacksService } from '../services/context-packs.service';
import { type PacksForChatDto, packsForChatSchema } from '../dto/packs-for-chat.dto';
import { type SavePackFromChatDto, savePackFromChatSchema } from '../dto/save-pack-from-chat.dto';

/**
 * Service-to-service only. `@Public()` skips the USER guard; ServiceTokenGuard
 * then requires the inter-service token. The by-id route had no guard at all
 * and no owner check — anything that could reach the container could read any
 * pack by id.
 */
@UseGuards(ServiceTokenGuard)
@Controller('internal/context-packs')
export class ContextPacksInternalController {
  constructor(private readonly contextPacksService: ContextPacksService) {}

  @Public()
  @Get(':id/items')
  async getItems(@Param('id') id: string): Promise<ContextPackWithItems | null> {
    return this.contextPacksService.getContextPackItemsInternal(id);
  }

  @Public()
  @Post('for-chat')
  @HttpCode(HttpStatus.OK)
  async forChat(
    @Body(new ZodValidationPipe(packsForChatSchema)) body: PacksForChatDto,
  ): Promise<ChatPacksBundle> {
    return this.contextPacksService.getPacksForChat(body);
  }

  @Public()
  @Post('save-from-chat')
  @HttpCode(HttpStatus.OK)
  async saveFromChat(
    @Body(new ZodValidationPipe(savePackFromChatSchema)) body: SavePackFromChatDto,
  ): Promise<SavePackFromChatResult> {
    return this.contextPacksService.saveFromChat(body);
  }
}
