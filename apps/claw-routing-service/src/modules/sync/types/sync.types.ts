import { type ModalityKind, type PrivacyClass, type QualityTier } from '../../../generated/prisma';

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
