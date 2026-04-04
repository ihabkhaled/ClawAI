import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { ChatMessage } from "../../../generated/prisma";

@Injectable()
export class ChatMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByThreadId(threadId: string): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(id: string): Promise<ChatMessage | null> {
    return this.prisma.chatMessage.findUnique({ where: { id } });
  }
}
