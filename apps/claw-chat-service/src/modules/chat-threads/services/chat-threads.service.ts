import { Injectable } from "@nestjs/common";
import { ChatThread } from "../../../generated/prisma";
import { ChatThreadsRepository } from "../repositories/chat-threads.repository";
import { EntityNotFoundException } from "../../../common/errors";

@Injectable()
export class ChatThreadsService {
  constructor(private readonly chatThreadsRepository: ChatThreadsRepository) {}

  async findByUserId(userId: string): Promise<ChatThread[]> {
    return this.chatThreadsRepository.findByUserId(userId);
  }

  async findById(id: string): Promise<ChatThread> {
    const thread = await this.chatThreadsRepository.findById(id);
    if (!thread) {
      throw new EntityNotFoundException("ChatThread", id);
    }
    return thread;
  }
}
