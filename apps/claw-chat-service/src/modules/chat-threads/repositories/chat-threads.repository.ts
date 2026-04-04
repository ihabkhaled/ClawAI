import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { ChatThread } from "../../../generated/prisma";

@Injectable()
export class ChatThreadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<ChatThread[]> {
    return this.prisma.chatThread.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findById(id: string): Promise<ChatThread | null> {
    return this.prisma.chatThread.findUnique({ where: { id } });
  }
}
