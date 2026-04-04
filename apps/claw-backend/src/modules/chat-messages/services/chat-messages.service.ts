import { Injectable } from "@nestjs/common";
import { ChatMessage } from "@prisma/client";
import { ChatMessagesRepository } from "../repositories/chat-messages.repository";
import { EntityNotFoundException } from "../../../common/errors";

@Injectable()
export class ChatMessagesService {
  constructor(private readonly chatMessagesRepository: ChatMessagesRepository) {}

  async findByThreadId(threadId: string): Promise<ChatMessage[]> {
    return this.chatMessagesRepository.findByThreadId(threadId);
  }

  async findById(id: string): Promise<ChatMessage> {
    const message = await this.chatMessagesRepository.findById(id);
    if (!message) {
      throw new EntityNotFoundException("ChatMessage", id);
    }
    return message;
  }
}
