'use client';

import { useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ChatMessage, UseExportThreadReturn } from '@/types';
import { logger, showToast } from '@/utilities';
import { downloadMarkdownFile } from '@/utilities/markdown-export.utility';
import {
  buildThreadExportFilename,
  buildThreadMarkdown,
} from '@/utilities/thread-markdown.utility';

/**
 * Downloads the open conversation as a Markdown file.
 *
 * Entirely client-side: the messages are already loaded, so a round trip would
 * buy nothing and would fail differently from the rest of the page. Compare runs
 * have had an export since they shipped; an ordinary thread — the thing people
 * actually want to paste into a ticket — had none.
 */
export function useExportThread(
  threadId: string,
  title: string,
  messages: readonly ChatMessage[],
): UseExportThreadReturn {
  const { t } = useTranslation();

  const exportThread = useCallback((): void => {
    if (messages.length === 0) {
      showToast.info({ description: t('chat.export.emptyThread') });
      return;
    }

    logger.info({
      component: 'chat',
      action: 'export-thread',
      message: 'Exporting thread as Markdown',
      details: { threadId, messageCount: messages.length },
    });

    downloadMarkdownFile(
      buildThreadExportFilename(title, threadId),
      buildThreadMarkdown({
        title,
        // Recorded in the file so a transcript pasted somewhere months later
        // still says when it was taken.
        exportedAt: new Date().toISOString(),
        messages,
      }),
    );
  }, [messages, t, threadId, title]);

  return { exportThread, canExport: messages.length > 0 };
}
