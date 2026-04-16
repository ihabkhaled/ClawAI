import { MODEL_ROLE_LABELS } from '@/constants/routing.constants';

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

export function decodeModelValue(value: string): { provider: string; model: string } | null {
  const parts = value.split('::');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { provider: parts[0], model: parts[1] };
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
