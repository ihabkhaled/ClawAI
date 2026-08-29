import { MODEL_ROLE_LABELS } from '@/constants/routing.constants';
import { isPaygBadgedProvider } from '@/utilities/credit.utility';

import type { JudgeModelOption } from '../types/chat.types';
import type { GroupedModels, ModelPickerGroup } from '../types/component.types';
import type { LocalModel } from '../types/routing.types';

const LOCAL_MODEL_CATEGORY_SPEC_LABELS: Record<string, string> = {
  GENERAL: 'Chatting',
  ROUTING: 'Routing',
  REASONING: 'Reasoning',
  CODING: 'Coding',
  THINKING: 'Thinking',
  FILE_GENERATION: 'File generation',
  IMAGE_GENERATION: 'Image generation',
};

export function encodeModelValue(provider: string, model: string): string {
  return `${provider}::${model}`;
}

// Flattens useAvailableModels()'s grouped catalog into the normalized shape
// ModelPicker renders. `encodeModelValue` is what the caller decodes back
// into { provider, model } on selection.
//
// `paygBadgeLabel` appends a cost hint to every model on a metered provider.
// It is a BADGE and nothing else: model-selector.tsx carries a written
// invariant that selection is never disabled client-side, and a per-connector
// admin toggle can flip a provider's PAYG status at runtime, so a browser copy
// of that rule would be stale within a minute. The server is the gate.
export function groupedModelsToPickerGroups(
  groupedModels: GroupedModels[],
  paygBadgeLabel?: string,
): ModelPickerGroup[] {
  return groupedModels.map((group) => ({
    key: group.provider,
    label: group.label,
    options: group.models.map((model) => ({
      value: encodeModelValue(model.provider, model.model),
      label: model.displayName,
      specifications: buildModelSpecifications(
        model.provider,
        model.specifications,
        paygBadgeLabel,
      ),
    })),
  }));
}

function buildModelSpecifications(
  provider: string,
  specifications: string[] | undefined,
  paygBadgeLabel: string | undefined,
): string[] | undefined {
  if (paygBadgeLabel === undefined || !isPaygBadgedProvider(provider)) {
    return specifications;
  }
  return [...(specifications ?? []), paygBadgeLabel];
}

export function decodeModelValue(value: string): { provider: string; model: string } | null {
  const parts = value.split('::');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { provider: parts[0], model: parts[1] };
}

// Judge/critic model pickers (compare-judge-controls, compare-critic-controls)
// source a flat, ungrouped JudgeModelOption[] from useJudgeModelOptions()
// rather than useAvailableModels()'s grouped catalog. The null-value "auto"
// entry (if present) is dropped here — ModelPicker's own `autoOption` prop is
// the single canonical "Auto" row for these two callers.
export function judgeModelOptionsToPickerGroups(options: JudgeModelOption[]): ModelPickerGroup[] {
  const concreteOptions = options.filter(
    (option): option is { value: string; label: string } => option.value !== null,
  );
  if (concreteOptions.length === 0) {
    return [];
  }
  return [{ key: 'judge-models', label: '', options: concreteOptions }];
}

export function getLocalModelSpecificationLabels(model: LocalModel): string[] {
  const labels = new Set<string>();

  for (const assignment of model.roles) {
    if (!assignment.isActive) {
      continue;
    }

    const label = MODEL_ROLE_LABELS[assignment.role];
    if (label !== undefined) {
      labels.add(label);
    }
  }

  if (model.category !== null) {
    const categoryLabel = LOCAL_MODEL_CATEGORY_SPEC_LABELS[model.category];
    if (categoryLabel !== undefined) {
      labels.add(categoryLabel);
    }
  }

  if (labels.size === 0) {
    labels.add('Chatting');
  }

  return [...labels];
}
