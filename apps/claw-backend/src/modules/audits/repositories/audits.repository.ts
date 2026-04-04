import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { AuditLog, Prisma } from "@prisma/client";

@Injectable()
export class AuditsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(params: {
    skip: number;
    take: number;
    where?: Prisma.AuditLogWhereInput;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        skip: params.skip,
        take: params.take,
        where: params.where,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where: params.where }),
    ]);
    return { logs, total };
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }
}
