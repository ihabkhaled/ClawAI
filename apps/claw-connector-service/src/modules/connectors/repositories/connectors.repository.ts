import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type Connector, Prisma } from '../../../generated/prisma';
import {
  type ConnectorFilters,
  type ConnectorPaygPolicyRow,
  type ConnectorWithModels,
  type CreateConnectorData,
  type UpdateConnectorData,
} from '../types/connectors.types';
import { isConnectorProvider } from '../utilities/connector-provider.utility';

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
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { models: true } } },
    }) as Promise<ConnectorWithModels[]>;
  }

  async update(id: string, data: UpdateConnectorData): Promise<Connector> {
    return this.prisma.connector.update({ where: { id }, data });
  }

  async findByProvider(provider: string): Promise<Connector | null> {
    // A provider outside the enum (the routing sentinel "AUTO" reached here for
    // every auto-routed Runtime V2 run) makes Prisma raise a validation error
    // that surfaced as an opaque 500. An unknown provider simply has no
    // connector.
    if (!isConnectorProvider(provider)) {
      return null;
    }
    return this.prisma.connector.findFirst({
      where: { provider, isEnabled: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findEnabled(): Promise<Connector[]> {
    return this.prisma.connector.findMany({
      where: { isEnabled: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Every connector's PAYG classification, projected to the three columns the
   * provider-grain rollup needs.
   *
   * Deliberately unfiltered and unpaginated: the rollup has to see disabled
   * rows too, so a provider whose only PAYG connector is switched off still
   * appears in the map as an explicit `false` instead of disappearing. The
   * table holds one row per configured provider account — tens, not thousands —
   * so reading all of them costs less than the two grouped queries a
   * conditional aggregate would need.
   */
  async findPaygPolicyRows(): Promise<ConnectorPaygPolicyRow[]> {
    return this.prisma.connector.findMany({
      select: { provider: true, isEnabled: true, isPayAsYouGo: true },
      orderBy: { provider: 'asc' },
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
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    return where;
  }
}
