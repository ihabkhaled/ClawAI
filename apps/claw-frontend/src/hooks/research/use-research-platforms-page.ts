import { useMemo } from 'react';

import { useTranslation } from '@/lib/i18n';
import type {
  ResearchPlatformTestView,
  UseResearchPlatformsPageReturn,
} from '@/types/research-platform.types';
import { describeResearchPlatformTest } from '@/utilities/research-platform.utility';

import { useResearchPlatformDelete } from './use-research-platform-delete';
import { useResearchPlatformFilter } from './use-research-platform-filter';
import { useResearchPlatformForm } from './use-research-platform-form';
import { useResearchPlatformTests } from './use-research-platform-tests';
import { useResearchPlatformToggle } from './use-research-platform-toggle';
import { useResearchPlatforms } from './use-research-platforms';

/** Controller for `/research/platforms`: list, category filter, add / edit, toggle, test, delete. */
export function useResearchPlatformsPage(): UseResearchPlatformsPageReturn {
  const { t, locale } = useTranslation();
  const list = useResearchPlatforms();
  const filter = useResearchPlatformFilter(list.platforms);
  const form = useResearchPlatformForm();
  const deletion = useResearchPlatformDelete();
  const toggle = useResearchPlatformToggle();
  const tests = useResearchPlatformTests();

  const testViews = useMemo(() => {
    const views: Record<string, ResearchPlatformTestView> = {};
    for (const [id, state] of Object.entries(tests.states)) {
      views[id] = describeResearchPlatformTest(state, t, locale);
    }
    return views;
  }, [tests.states, t, locale]);

  return {
    t,
    platforms: list.platforms,
    isLoading: list.isLoading,
    isError: list.isError,
    filter,
    form,
    deletion,
    toggle,
    testingIds: tests.testingIds,
    testViews,
    runTest: (id) => void tests.run(id),
    deleteTitle:
      deletion.pending === null
        ? ''
        : t('researchPlatforms.deleteTitle', { name: deletion.pending.name }),
  };
}
