import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type RoutingPolicy, type Prisma } from "../../../generated/prisma";
import {
  type CreatePolicyData,
  type UpdatePolicyData,
  type PolicyFilters,
} from "../types/routing.types";

@Injectable()
export class RoutingPoliciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePolicyData): Promise<RoutingPolicy> {
    return this.prisma.routingPolicy.create({ data });
  }

  async findById(id: string): Promise<RoutingPolicy | null> {
    return this.prisma.routingPolicy.findUnique({ where: { id } });
  }

  async findAll(
    filters: PolicyFilters,
    page: number,
    limit: number,
  ): Promise<RoutingPolicy[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.routingPolicy.findMany({
      where,
      skip,
      take: limit,
      orderBy: { priority: "asc" },
    });
  }

  async countAll(filters: PolicyFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.routingPolicy.count({ where });
  }

  async findActivePolicies(): Promise<RoutingPolicy[]> {
    return this.prisma.routingPolicy.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    });
  }

  async update(id: string, data: UpdatePolicyData): Promise<RoutingPolicy> {
    return this.prisma.routingPolicy.update({ where: { id }, data });
  }

  async delete(id: string): Promise<RoutingPolicy> {
    return this.prisma.routingPolicy.delete({ where: { id } });
  }

  private buildWhereClause(filters: PolicyFilters): Prisma.RoutingPolicyWhereInput {
    const where: Prisma.RoutingPolicyWhereInput = {};

    if (filters.routingMode !== undefined) {
      where.routingMode = filters.routingMode;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return where;
  }
}
