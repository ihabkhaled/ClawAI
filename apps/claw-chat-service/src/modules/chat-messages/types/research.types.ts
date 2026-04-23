/**
 * Shape of a research run returned by claw-research-service. Mirrored from
 * `apps/claw-research-service/src/modules/research/types/evidence-bundle.types.ts`
 * — we only type the fields the chat layer actually reads.
 */

import type { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';

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
    selectionMode: 'explicit' | 'auto';
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

export type ResearchRunResponse = {
  id: string;
  userId: string;
  requestedModel: string | null;
  requestedProvider: string | null;
  workflow: string;
  intent: string;
  status: string;
  bundle: ResearchEvidenceBundle | Record<string, never>;
  trace: Array<{
    phase: string;
    status: string;
    latencyMs: number | null;
    message: string | null;
    timestamp: string;
  }>;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type ResearchRequest = {
  userToken: string;
  userId: string;
  intent: string;
  workflow: ResearchWorkflow;
  searchProviderId?: string;
  requestedModel?: string;
  requestedProvider?: string;
  maxResults?: number;
};
