import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type Connector, Prisma } from "../../../generated/prisma";
import {
  type CreateConnectorData,
  type UpdateConnectorData,
  type ConnectorFilters,
  type ConnectorWithModels,
} from "../types/connectors.types";

@Injectable()
export class ConnectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateConnectorData): Promise<Connector> {
    return this.prisma.connector.create({ data });
  }

  async findById(id: string): Promise<Connector | null> {
    return this.prisma.connector.findUnique({ where: { id } });
  }

  async findAll(
    filters: ConnectorFilters,
    page: number,
    limit: number,
  ): Promise<ConnectorWithModels[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.connector.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { models: true } } },
    }) as Promise<ConnectorWithModels[]>;
  }

  async update(id: string, data: UpdateConnectorData): Promise<Connector> {
    return this.prisma.connector.update({ where: { id }, data });
  }

  async findByProvider(provider: string): Promise<Connector | null> {
    return this.prisma.connector.findFirst({
      where: { provider: provider as Prisma.EnumConnectorProviderFilter["equals"], isEnabled: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async delete(id: string): Promise<Connector> {
    return this.prisma.connector.delete({ where: { id } });
  }

  async countAll(filters: ConnectorFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.connector.count({ where });
  }

  private buildWhereClause(filters: ConnectorFilters): Prisma.ConnectorWhereInput {
    const where: Prisma.ConnectorWhereInput = {};

    if (filters.provider !== undefined) {
      where.provider = filters.provider;
    }

    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    if (filters.isEnabled !== undefined) {
      where.isEnabled = filters.isEnabled;
    }

    if (filters.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }

    return where;
  }
}
