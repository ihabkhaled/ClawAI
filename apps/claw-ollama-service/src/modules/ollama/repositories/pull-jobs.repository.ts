import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type PullJob } from "../../../generated/prisma";
import {
  type CreatePullJobData,
  type UpdatePullJobData,
} from "../types/ollama.types";

@Injectable()
export class PullJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePullJobData): Promise<PullJob> {
    return this.prisma.pullJob.create({ data });
  }

  async findById(id: string): Promise<PullJob | null> {
    return this.prisma.pullJob.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdatePullJobData): Promise<PullJob> {
    return this.prisma.pullJob.update({ where: { id }, data });
  }

  async findRecent(limit: number): Promise<PullJob[]> {
    return this.prisma.pullJob.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }
}
