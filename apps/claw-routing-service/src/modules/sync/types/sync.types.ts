import { type ModalityKind, type PrivacyClass, type QualityTier } from '../../../generated/prisma';
import { type ModelIntelligenceEnrichment } from '../../router-models/types/model-intelligence.types';

export type UpstreamModelSnapshot = {
  provider: string;
  modelKey: string;
  displayName: string;
  family?: string;
  isLocal?: boolean;
  modalitiesIn?: ModalityKind[];
  modalitiesOut?: ModalityKind[];
  contextWindowTokens?: number;
  maxOutputTokens?: number;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
  qualityTier?: QualityTier;
  privacySupport?: PrivacyClass;
  // Phase 3: optional richer intelligence block. Sync sources that can
  // provide it (llamacpp catalog, advanced connector controllers) include
  // it directly; otherwise the sync manager falls back to the curated cloud
  // table + local family heuristics.
  intelligence?: ModelIntelligenceEnrichment;
};

export type SyncProviderResult = {
  provider: string;
  source: string;
  upstreamCount: number;
  upsertedCount: number;
  skippedCount: number;
  status: 'OK' | 'UPSTREAM_404' | 'UPSTREAM_ERROR';
  errorMessage?: string;
};

export type SnapshotFetchOutcome =
  | { status: 'OK'; models: UpstreamModelSnapshot[] }
  | { status: 'UPSTREAM_404' }
  | { status: 'UPSTREAM_ERROR'; message: string };

export type SyncRunResult = {
  runStartedAt: string;
  runFinishedAt: string;
  durationMs: number;
  totals: {
    upstreamCount: number;
    upsertedCount: number;
    skippedCount: number;
  };
  perProvider: SyncProviderResult[];
};
