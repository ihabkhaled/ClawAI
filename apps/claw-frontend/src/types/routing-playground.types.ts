import type { RoutingMode } from '@/enums';

import type {
  AnalyzeSemanticRequest,
  SemanticIntentAnalysisRecord,
} from './semantic-analysis.types';

export type RoutingPlaygroundTab = 'semantic';

export type RoutingPlaygroundFormState = {
  message: string;
  routingMode: RoutingMode;
};

export type RoutingPlaygroundPageReturn = {
  activeTab: RoutingPlaygroundTab;
  setActiveTab: (tab: RoutingPlaygroundTab) => void;
  message: string;
  setMessage: (value: string) => void;
  routingMode: RoutingMode;
  setRoutingMode: (mode: RoutingMode) => void;
  handleRunSemantic: () => void;
  resetForm: () => void;
  semanticResult: SemanticIntentAnalysisRecord | undefined;
  isSemanticPending: boolean;
  isSemanticError: boolean;
  semanticError: string | null;
};

export type AnalyzeSemanticVariables = AnalyzeSemanticRequest;
