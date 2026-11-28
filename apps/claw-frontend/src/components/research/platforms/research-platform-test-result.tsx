import { CircleAlert, CircleCheck } from 'lucide-react';

import { RESEARCH_PLATFORM_TEST_OUTCOME_CLASSES } from '@/constants/research-platform.constants';
import { ResearchPlatformTestOutcome } from '@/enums/research-platform-test-outcome.enum';
import { cn } from '@/lib/utils';
import type { ResearchPlatformTestResultProps } from '@/types/research-platform.types';

/** The last test of one platform: "Works: 5 results in 812 ms" or why it failed. */
export function ResearchPlatformTestResult({
  slug,
  view,
}: ResearchPlatformTestResultProps): React.ReactElement {
  return (
    <p
      role="status"
      data-testid={`research-platform-test-result-${slug}`}
      data-outcome={view.outcome}
      className={cn(
        'flex items-center justify-end gap-1 text-xs break-words',
        RESEARCH_PLATFORM_TEST_OUTCOME_CLASSES[view.outcome],
      )}
    >
      {view.outcome === ResearchPlatformTestOutcome.PASSED ? (
        <CircleCheck className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0">{view.label}</span>
    </p>
  );
}
