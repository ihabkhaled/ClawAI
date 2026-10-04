import type {
  ConnectorProviderDefinition,
  Prisma,
  ProviderAdapterFamily,
} from '../../../generated/prisma';

export type ProviderDefinitionRecord = Prisma.ConnectorProviderDefinitionGetPayload<{
  include: {
    connectors: { select: { _count: { select: { models: true } } } };
    _count: { select: { connectors: true } };
  };
}>;

export interface ProviderDefinitionFilters {
  search?: string;
  isActive?: boolean;
  isBuiltIn?: boolean;
  adapterFamily?: ProviderAdapterFamily;
}

export interface ProviderDefinitionListItem extends ConnectorProviderDefinition {
  connectorCount: number;
  modelCount: number;
}

export interface ProviderDefinitionActor {
  id: string;
}

export interface ProviderDefinitionDependencies {
  connectorCount: number;
  modelCount: number;
}

export interface ProviderDefinitionListResult {
  data: ProviderDefinitionListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
