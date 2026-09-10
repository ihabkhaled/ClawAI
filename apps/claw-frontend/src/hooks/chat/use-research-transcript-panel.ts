'use client';

import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ResearchTranscript, UseResearchTranscriptPanelReturn } from '@/types';

/**
 * Controller for the research transcript badge.
 *
 * It owns the open/close state and, more importantly, **what the badge is
 * allowed to claim**. The label used to be `Used {sources.length} sources`,
 * where `sources` is the deduped mix of search hits and fetch results — so it
 * announced four sources when four links had been discovered and zero pages may
 * have been read. Pages read and links found are two different numbers and are
 * now shown as two.
 *
 * Messages written before 2026-09-10 carry neither count. For those the badge
 * says `{n} sources`, which is neutral: we genuinely do not know how many were
 * read, and inventing the stronger claim retroactively is the defect this
 * replaces.
 */
export function useResearchTranscriptPanel(
  transcript: ResearchTranscript,
): UseResearchTranscriptPanelReturn {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toggle = useCallback((): void => {
    setOpen((prev) => !prev);
  }, []);

  const pagesRead = transcript.pagesRead;
  const linksFound = transcript.linksFound;
  const isMeasured = pagesRead !== undefined;

  const title = isMeasured
    ? t('research.transcript.pagesRead', { count: String(pagesRead) })
    : t('research.transcript.sourcesCount', { count: String(transcript.sources.length) });

  return {
    open,
    toggle,
    title,
    isMeasured,
    linksFoundLabel:
      linksFound === undefined
        ? null
        : t('research.transcript.linksFound', { count: String(linksFound) }),
    searchRequestsLabel: t('research.transcript.searchRequests', {
      count: String(transcript.searchRequestCount ?? 0),
    }),
    fetchRequestsLabel: t('research.transcript.fetchRequests', {
      count: String(transcript.fetchRequestCount ?? 0),
    }),
  };
}
