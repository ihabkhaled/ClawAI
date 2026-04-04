import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type RoutingDecision } from "../../../generated/prisma";
import { type CreateDecisionData } from "../types/routing.types";

@Injectable()
export class RoutingDecisionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDecisionData): Promise<RoutingDecision> {
    return this.prisma.routingDecision.create({
      data: {
        ...data,
        confidence: data.confidence !== undefined ? data.confidence : null,
      },
    });
  }

  async findById(id: string): Promise<RoutingDecision | null> {
    return this.prisma.routingDecision.findUnique({ where: { id } });
  }

  async findByThreadId(
    threadId: string,
    page: number,
    limit: number,
  ): Promise<RoutingDecision[]> {
    const skip = (page - 1) * limit;
    return this.prisma.routingDecision.findMany({
      where: { threadId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async countByThreadId(threadId: string): Promise<number> {
    return this.prisma.routingDecision.count({ where: { threadId } });
  }
}
