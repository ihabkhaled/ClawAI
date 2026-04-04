import type { ConnectorProvider, ConnectorStatus } from "@/enums";

export interface Connector {
  id: string;
  name: string;
  provider: ConnectorProvider;
  status: ConnectorStatus;
  baseUrl: string | null;
  modelCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorDetail extends Connector {
  models: ConnectorModel[];
  lastSyncAt: string | null;
}

export interface ConnectorModel {
  id: string;
  name: string;
  displayName: string;
  isEnabled: boolean;
}

export interface CreateConnectorRequest {
  name: string;
  provider: ConnectorProvider;
  apiKey: string;
  baseUrl?: string;
}
