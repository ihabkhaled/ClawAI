import { useState } from 'react';

import { ResearchPlatformTestOutcome } from '@/enums/research-platform-test-outcome.enum';
import type {
  ResearchPlatformTestState,
  UseResearchPlatformTestsReturn,
} from '@/types/research-platform.types';
import { researchPlatformTestStateOf } from '@/utilities/research-platform.utility';

import { useTestResearchPlatform } from './use-research-platforms';

/** The last test result per platform, and which rows are testing right now (several may at once). */
export function useResearchPlatformTests(): UseResearchPlatformTestsReturn {
  const test = useTestResearchPlatform();
  const [states, setStates] = useState<Record<string, ResearchPlatformTestState>>({});
  const [testingIds, setTestingIds] = useState<ReadonlySet<string>>(new Set());

  const setTesting = (id: string, isTesting: boolean): void =>
    setTestingIds((prev) => {
      const next = new Set(prev);
      if (isTesting) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });

  const run = async (id: string): Promise<void> => {
    setTesting(id, true);
    try {
      const result = await test.mutateAsync(id);
      setStates((prev) => ({ ...prev, [id]: researchPlatformTestStateOf(result) }));
    } catch (error) {
      console.error('Research platform test failed', error);
      const failed = { outcome: ResearchPlatformTestOutcome.REQUEST_FAILED, result: null };
      setStates((prev) => ({ ...prev, [id]: failed }));
    } finally {
      setTesting(id, false);
    }
  };

  return { states, testingIds, run };
}
