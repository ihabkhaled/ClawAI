import { Injectable, Logger } from '@nestjs/common';
import { ContextPackItemType } from '../../../generated/prisma';
import { CHAT_PACK_OPTIONS_LIMIT } from '../constants/context-packs-for-chat.constants';
import { type AddItemFromChatDto } from '../dto/add-item-from-chat.dto';
import { ContextPacksRepository } from '../repositories/context-packs.repository';
import { type AddItemFromChatResult, type ChatPackOption } from '../types/context-packs.types';
import { ContextPacksService } from './context-packs.service';

/**
 * What a chat needs to save into an EXISTING pack (ADR-133): the list of the
 * user's packs to choose from, and adding one item to the chosen one. Kept
 * apart from ContextPacksService, which is already past its size ceiling.
 * Ownership is checked by `addItem` itself, so a chat can never add to a pack
 * that is not the asking user's.
 */
@Injectable()
export class ContextPackChatService {
  private readonly logger = new Logger(ContextPackChatService.name);

  constructor(
    private readonly contextPacksRepository: ContextPacksRepository,
    private readonly contextPacksService: ContextPacksService,
  ) {}

  async listOptions(userId: string): Promise<ChatPackOption[]> {
    const options = await this.contextPacksRepository.findChatOptions(
      userId,
      CHAT_PACK_OPTIONS_LIMIT,
    );
    this.logger.debug(`listOptions: user=${userId} packs=${String(options.length)}`);
    return options;
  }

  /**
   * Idempotent: a regenerated save turn runs the save again, and the same text
   * already in this pack is returned rather than added twice. The lookup runs
   * only for the pack's owner, so it never reveals another user's items;
   * anyone else falls through to `addItem`, which refuses them.
   */
  async addItemFromChat(packId: string, dto: AddItemFromChatDto): Promise<AddItemFromChatResult> {
    const pack = await this.contextPacksRepository.findById(packId);
    const existing =
      pack?.userId === dto.userId
        ? await this.contextPacksRepository.findItemWithContent(packId, dto.content)
        : null;
    if (existing !== null && pack !== null) {
      this.logger.log(
        `addItemFromChat: pack=${packId} already holds this text — item=${existing.id}`,
      );
      return { packId, itemId: existing.id, name: pack.name };
    }
    const item = await this.contextPacksService.addItem(packId, dto.userId, {
      itemType: ContextPackItemType.MARKDOWN,
      content: dto.content,
    });
    this.logger.log(
      `addItemFromChat: pack=${packId} item=${item.id} message=${dto.sourceMessageId}`,
    );
    return { packId, itemId: item.id, name: pack?.name ?? '' };
  }
}
