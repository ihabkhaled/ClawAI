import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import {
  type LocalModelRole,
  type LocalModelRoleAssignment,
} from "../../../generated/prisma";
import { type CreateRoleAssignmentData } from "../types/ollama.types";

@Injectable()
export class RoleAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRoleAssignmentData): Promise<LocalModelRoleAssignment> {
    return this.prisma.localModelRoleAssignment.create({ data });
  }

  async findActiveByRole(role: LocalModelRole): Promise<LocalModelRoleAssignment | null> {
    return this.prisma.localModelRoleAssignment.findFirst({
      where: { role, isActive: true },
      include: { model: true },
    });
  }

  async deactivateByRole(role: LocalModelRole): Promise<void> {
    await this.prisma.localModelRoleAssignment.updateMany({
      where: { role, isActive: true },
      data: { isActive: false },
    });
  }

  async findByModelId(modelId: string): Promise<LocalModelRoleAssignment[]> {
    return this.prisma.localModelRoleAssignment.findMany({
      where: { modelId },
    });
  }

  async delete(id: string): Promise<LocalModelRoleAssignment> {
    return this.prisma.localModelRoleAssignment.delete({ where: { id } });
  }
}
