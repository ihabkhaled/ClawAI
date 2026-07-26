import { Injectable } from '@nestjs/common';

import {
  type OwnerChatShareView,
  type PublicChatShareMessage,
  type PublicChatShareResponse,
} from '../types/chat-shares.types';
import { type ChatShare, type ChatShareMessage } from '../../../generated/prisma';

/**
 * The last line of defence before data leaves the service.
 *
 * Every mapping is an explicit field list. A spread would publish
 * `ownerUserId`, the private `threadId`, `safetyStatus` and internal
 * timestamps — and, worse, would keep publishing every column added to the
 * model in future without anybody noticing.
 */
@Injectable()
export class ChatShareMapperService {
  toPublicResponse(share: ChatShare & { messages: ChatShareMessage[] }): PublicChatShareResponse {
    return {
      publicShareId: share.publicShareId,
      title: share.title,
      description: share.description,
      publishedAt: share.publishedAt.toISOString(),
      updatedAt: share.updatedAt.toISOString(),
      snapshotVersion: share.snapshotVersion,
      messageCount: share.messageCount,
      adsEligible: share.adsEligible,
      visibility: share.visibility,
      messages: share.messages.map((message) => this.toPublicMessage(message)),
    };
  }

  private toPublicMessage(message: ChatShareMessage): PublicChatShareMessage {
    return {
      // The PUBLIC id. `message.id` is the share-message row's own primary key
      // and stays internal; publicMessageId is what the outside world sees.
      id: message.publicMessageId,
      sequence: message.sequence,
      role: message.role,
      content: message.content,
      providerLabel: message.providerLabel,
      modelLabel: message.modelLabel,
      createdAt: message.originalCreatedAt.toISOString(),
    };
  }

  toOwnerView(
    share: ChatShare,
    publicUrl: string,
    hasUnpublishedMessages: boolean,
  ): OwnerChatShareView {
    return {
      publicShareId: share.publicShareId,
      publicUrl,
      status: share.status,
      visibility: share.visibility,
      safetyStatus: share.safetyStatus,
      snapshotVersion: share.snapshotVersion,
      title: share.title,
      messageCount: share.messageCount,
      adsEligible: share.adsEligible,
      publishedAt: share.publishedAt.toISOString(),
      lastSnapshotAt: share.lastSnapshotAt.toISOString(),
      hasUnpublishedMessages,
    };
  }
}
