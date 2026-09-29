'use client';

import { useMemo } from 'react';

import { useTranslation } from '@/lib/i18n/use-translation';
import type { ThreadLineageBarProps } from '@/types';
import { buildLineageBarProps } from '@/utilities';

import { useThreadLineage } from './use-thread-lineage';

/** Props for the lineage strip above a conversation. */
export function useThreadLineageBar(threadId: string): ThreadLineageBarProps {
  const { t } = useTranslation();
  const { lineage } = useThreadLineage(threadId);
  const branchCount = lineage?.branches.length ?? 0;
  return useMemo(
    () =>
      buildLineageBarProps(lineage, {
        branchedFromLabel: t('chat.lineage.branchedFrom'),
        sourceDeletedLabel: t('chat.lineage.sourceDeleted'),
        branchesLabel: t('chat.lineage.branches', { count: branchCount }),
        untitledLabel: t('chat.untitled'),
      }),
    [lineage, branchCount, t],
  );
}
