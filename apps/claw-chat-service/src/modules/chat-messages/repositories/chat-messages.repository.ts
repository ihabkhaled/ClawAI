import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type ChatMessage } from "../../../generated/prisma";
import { type CreateMessageData } from "../types/chat-messages.types";

@Injectable()
export class ChatMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMessageData): Promise<ChatMessage> {
    return this.prisma.chatMessage.create({ data });
  }

  async findById(id: string): Promise<ChatMessage | null> {
    return this.prisma.chatMessage.findUnique({ where: { id } });
  }

  async findByThreadId(threadId: string, page: number, limit: number): Promise<ChatMessage[]> {
    const skip = (page - 1) * limit;
    return this.prisma.chatMessage.findMany({
      where: { threadId },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
    });
  }

  async countByThreadId(threadId: string): Promise<number> {
    return this.prisma.chatMessage.count({ where: { threadId } });
  }

  async findRecentByThreadId(threadId: string, limit: number): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { threadId },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteByThreadId(threadId: string): Promise<number> {
    const result = await this.prisma.chatMessage.deleteMany({ where: { threadId } });
    return result.count;
  }
}
