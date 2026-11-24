import { useCallback, useState } from 'react';

import type {
  LiveCreateSessionInput,
  UseLiveStartFormResult,
  UseLiveSummaryStartResult,
  UseLiveUsageResult,
} from '@/types/live.types';
import { liveSummaryEstimate } from '@/utilities/live-request.utility';

/**
 * The "Summarize video" step: shows what the summary uses (the video's length as Live minutes,
 * free first) and, once confirmed, opens the modal on a summary session; paid minutes past the
 * allowance are approved together with that confirmation (owner decision 2026-11-24).
 */
export function useLiveSummaryStart(
  form: UseLiveStartFormResult,
  usage: UseLiveUsageResult,
  open: (input: LiveCreateSessionInput) => void,
): UseLiveSummaryStartResult {
  const [isOpen, setIsOpen] = useState(false);
  const estimate = isOpen
    ? liveSummaryEstimate(form.resolution?.durationSeconds, usage.usage)
    : null;
  const { buildSessionInput } = form;

  const confirm = useCallback((): void => {
    const input = buildSessionInput();
    if (input !== null && estimate !== null) {
      open({ ...input, summarize: true, approvePaid: estimate.paidMinutes > 0 });
    }
    setIsOpen(false);
  }, [buildSessionInput, estimate, open]);

  return {
    estimate,
    openSummary: () => setIsOpen(true),
    closeSummary: () => setIsOpen(false),
    confirmSummary: confirm,
  };
}
