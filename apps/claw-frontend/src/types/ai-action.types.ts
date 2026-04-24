import type { ReactNode } from 'react';

import type {
  AiActionKind,
  AiActionMode,
  AiActionPrivacyClass,
} from '../enums/ai-action-kind.enum';
import type { AiActionLength, AiActionTone } from '../enums/ai-action-tone.enum';

import type { GroupedModels } from './component.types';
import type { TranslateFunction } from './i18n.types';

export type ModelChoice = {
  provider: string;
  model: string;
  displayName: string;
};

export type ModelChoiceOrAuto =
  | { mode: AiActionMode.AUTO }
  | { mode: AiActionMode.MANUAL; choice: ModelChoice };

export type GeneratedBy = {
  provider: string;
  model: string;
  displayName: string;
  mode: AiActionMode;
  fallbackChain?: ModelChoice[];
};

export type AiActionOptions = {
  tone?: AiActionTone;
  length?: AiActionLength;
  language?: string;
};

export type AiActionResult = {
  content: string;
  generatedBy: GeneratedBy;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
};

export type AiActionRequest = {
  actionKind: AiActionKind;
  privacyClass: AiActionPrivacyClass;
  modelChoice: ModelChoiceOrAuto;
  options?: AiActionOptions;
  context: string;
};

export type UseAiActionResult = {
  run: (request: AiActionRequest) => Promise<AiActionResult | null>;
  result: AiActionResult | null;
  isRunning: boolean;
  error: Error | null;
  reset: () => void;
};

export type AiActionDialogProps = {
  open: boolean;
  onClose: () => void;
  actionKind: AiActionKind;
  privacyClass?: AiActionPrivacyClass;
  contextPreview: ReactNode;
  initialContext: string;
  onGenerated?: (result: AiActionResult) => void;
  onSendToApproval?: (result: AiActionResult) => void;
  t: TranslateFunction;
};

export type AutoRouterResolution = {
  primary: ModelChoice;
  fallbackChain: ModelChoice[];
  mode: AiActionMode;
};

export type ResolveAiActionRequest = {
  actionKind: AiActionKind;
  privacyClass: AiActionPrivacyClass;
  preferredModel?: ModelChoice;
};

export type UseResolveAiActionResult = {
  resolution: AutoRouterResolution | null;
  resolve: (request: ResolveAiActionRequest) => void;
  isPending: boolean;
  error: Error | null;
};

export type UseAvailableModelsForActionResult = {
  groupedModels: GroupedModels[];
  isLoading: boolean;
};

export type UseRunAiActionResult = {
  result: AiActionResult | null;
  run: (body: {
    actionKind: AiActionKind;
    privacyClass: AiActionPrivacyClass;
    context: string;
    preferredModel?: ModelChoice;
  }) => void;
  reset: () => void;
  isPending: boolean;
  error: Error | null;
};

export type UseAiActionDialogResult = {
  groupedModels: GroupedModels[];
  isLoadingModels: boolean;
  selectedKey: string;
  setSelectedKey: (key: string) => void;
  result: AiActionResult | null;
  isPending: boolean;
  error: Error | null;
  copied: boolean;
  handleGenerate: () => void;
  handleCopy: () => void;
  handleClose: () => void;
};
