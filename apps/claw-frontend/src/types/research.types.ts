import type { ResearchMode } from '@/enums/research-mode.enum';
import type { ResearchProviderKind } from '@/enums/research-provider-kind.enum';
import type { ResearchProviderSelectionMode } from '@/enums/research-provider-selection-mode.enum';
import type { ResearchProviderStatus } from '@/enums/research-provider-status.enum';

export type ResearchOptions = {
  mode: ResearchMode;
  providerId?: string;
};

export type SanitizedResearchProvider = {
  id: string;
  kind: ResearchProviderKind;
  name: string;
  description: string | null;
  baseUrl: string;
  hasSecret: boolean;
  secretVersion: number;
  enabled: boolean;
  priority: number;
  status: ResearchProviderStatus;
  publicConfig: Record<string, unknown>;
  allowlistDomains: string[];
  blocklistDomains: string[];
  timeoutMs: number;
  lastValidatedAt: string | null;
  validationError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResearchEvidenceItem = {
  id: string;
  title: string | null;
  url: string;
  snippet: string;
  source: string;
  providerKind: string | null;
  publishedAt: string | null;
  fetchedAt: string | null;
  confidence: number;
};

export type ResearchEvidenceBundle = {
  intent: string;
  workflow: string;
  requestedModel: string | null;
  requestedProvider: string | null;
  providerSelection: {
    providerId: string | null;
    providerName: string | null;
    providerKind: string | null;
    selectionMode: ResearchProviderSelectionMode;
    fallbackUsed: boolean;
    attemptedProviders: string[];
  };
  helperModels: string[];
  toolsUsed: string[];
  items: ResearchEvidenceItem[];
  warnings: string[];
  generatedAt: string;
  mode: string;
};

export type ResearchTraceEntry = {
  phase: string;
  status: string;
  latencyMs: number | null;
  message: string | null;
  timestamp: string;
};

export type ResearchRun = {
  id: string;
  userId: string;
  requestedModel: string | null;
  requestedProvider: string | null;
  workflow: string;
  intent: string;
  status: string;
  bundle: ResearchEvidenceBundle | Record<string, never>;
  trace: ResearchTraceEntry[];
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type CreateResearchProviderRequest = {
  kind: ResearchProviderKind;
  name: string;
  description?: string;
  baseUrl: string;
  secretConfig?: Record<string, string>;
  publicConfig?: Record<string, unknown>;
  enabled?: boolean;
  priority?: number;
  allowlistDomains?: string[];
  blocklistDomains?: string[];
  timeoutMs?: number;
};

export type ProviderHealthResult = {
  healthy: boolean;
  latencyMs: number;
  errorMessage?: string;
};
