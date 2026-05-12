import type {
  CostClass,
  CostConfidence,
  DomainTag,
  LatencyClass,
  ModalityKind,
  PrivacyClass,
  QualityTier,
  RouterModelLifecycle,
} from '@/enums/router-models.enum';

export type RouterModel = {
  id: string;
  provider: string;
  modelKey: string;
  displayName: string;
  family: string | null;
  connectorId: string | null;
  runtimeId: string | null;
  isLocal: boolean;
  isRouterOnly: boolean;
  isExecutionCapable: boolean;
  lifecycle: RouterModelLifecycle;
  modalitiesIn: ModalityKind[];
  modalitiesOut: ModalityKind[];
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  domainTags: DomainTag[];
  notRecommendedFor: DomainTag[];
  inputCostPer1M: string | null;
  outputCostPer1M: string | null;
  costConfidence: CostConfidence;
  costClass: CostClass | null;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  latencyClass: LatencyClass | null;
  qualityTier: QualityTier;
  hallucinationRisk: string | null;
  judgeSuitability: boolean;
  searchSuitability: boolean;
  fallbackSuitability: boolean;
  privacySupport: PrivacyClass;
  metadataSource: string;
  externalCardUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
};

export type RouterModelsListMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type RouterModelsList = {
  data: RouterModel[];
  meta: RouterModelsListMeta;
};

export type RouterAdminOverride = {
  id: string;
  profileId: string;
  fieldName: string;
  fieldValue: unknown;
  reason: string | null;
  setBy: string;
  setAt: string;
  isActive: boolean;
};

export type ListRouterModelsQuery = {
  page?: number;
  limit?: number;
  provider?: string;
  lifecycle?: RouterModelLifecycle;
  isLocal?: boolean;
  isRouterOnly?: boolean;
  isExecutionCapable?: boolean;
  domain?: DomainTag;
  costClass?: CostClass;
  qualityTier?: QualityTier;
  search?: string;
};

export type UpdateRouterModelRequest = {
  displayName?: string;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
  costConfidence?: CostConfidence;
  costClass?: CostClass;
  qualityTier?: QualityTier;
  isRouterOnly?: boolean;
  lifecycle?: RouterModelLifecycle;
  overrideReason?: string;
};

export type UpdateRouterModelMutationVars = {
  id: string;
  payload: UpdateRouterModelRequest;
};
