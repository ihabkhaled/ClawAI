import { Injectable } from '@nestjs/common';
import {
  type ConnectorProvider,
  type ConnectorProviderDefinition,
  Prisma,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type ProviderDefinitionFilters,
  type ProviderDefinitionRecord,
} from '../types/provider-definition.types';

@Injectable()
export class ProviderDefinitionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(
    filters: ProviderDefinitionFilters,
    page: number,
    limit: number,
  ): Promise<ProviderDefinitionRecord[]> {
    return this.prisma.connectorProviderDefinition.findMany({
      where: this.buildWhere(filters),
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ updatedAt: 'desc' }, { key: 'asc' }],
      include: {
        connectors: { select: { _count: { select: { models: true } } } },
        _count: { select: { connectors: true } },
      },
    });
  }

  async count(filters: ProviderDefinitionFilters): Promise<number> {
    return this.prisma.connectorProviderDefinition.count({ where: this.buildWhere(filters) });
  }

  async findById(id: string): Promise<ProviderDefinitionRecord | null> {
    return this.prisma.connectorProviderDefinition.findUnique({
      where: { id },
      include: {
        connectors: { select: { _count: { select: { models: true } } } },
        _count: { select: { connectors: true } },
      },
    });
  }

  async findByKey(key: string): Promise<ConnectorProviderDefinition | null> {
    return this.prisma.connectorProviderDefinition.findUnique({ where: { key } });
  }

  async findByConnectorProvider(
    provider: ConnectorProvider,
  ): Promise<ConnectorProviderDefinition | null> {
    return this.prisma.connectorProviderDefinition.findUnique({
      where: { connectorProvider: provider },
    });
  }

  async create(
    data: Prisma.ConnectorProviderDefinitionCreateInput,
  ): Promise<ConnectorProviderDefinition> {
    return this.prisma.connectorProviderDefinition.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ConnectorProviderDefinitionUpdateInput,
  ): Promise<ConnectorProviderDefinition> {
    return this.prisma.connectorProviderDefinition.update({ where: { id }, data });
  }

  async delete(id: string): Promise<ConnectorProviderDefinition> {
    return this.prisma.connectorProviderDefinition.delete({ where: { id } });
  }

  private buildWhere(
    filters: ProviderDefinitionFilters,
  ): Prisma.ConnectorProviderDefinitionWhereInput {
    return {
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.isBuiltIn === undefined ? {} : { isBuiltIn: filters.isBuiltIn }),
      ...(filters.adapterFamily === undefined ? {} : { adapterFamily: filters.adapterFamily }),
      ...(filters.search === undefined
        ? {}
        : {
            OR: [
              { key: { contains: filters.search, mode: 'insensitive' } },
              { displayName: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }),
    };
  }
}
