import { useMemo } from 'react';

import { useLocalModels } from '@/hooks/ollama/use-local-models';
import type { JudgeModelOption } from '@/types';

export function useJudgeModelOptions(): {
  options: JudgeModelOption[];
  isLoading: boolean;
} {
  const { models, isLoading } = useLocalModels();

  const options = useMemo((): JudgeModelOption[] => {
    return models
      .filter((m) => m.isInstalled && !m.roles.some((r) => r.role === 'ROUTER' && r.isActive))
      .map((m) => {
        const fullName = m.tag && m.tag !== 'latest' ? `${m.name}:${m.tag}` : m.name;
        return { value: fullName, label: fullName };
      })
      .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''));
  }, [models]);

  return { options, isLoading };
}
