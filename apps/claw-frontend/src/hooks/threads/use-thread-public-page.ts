'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { THREAD_EXPORT_FILES } from '@/constants/thread-publication.constants';
import { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import { useThreadPublicActions } from '@/hooks/threads/use-thread-public-actions';
import { useThreadPublicQueries } from '@/hooks/threads/use-thread-public-queries';
import { useThreadPublicView } from '@/hooks/threads/use-thread-public-view';
import { useTranslation } from '@/lib/i18n';
import { ApiClientError } from '@/services/shared/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type { ThreadExportFile } from '@/types/thread-export.types';
import type {
  ThreadPublicPageController,
  PublicThreadPublication,
} from '@/types/thread-publication.types';
import {
  buildThreadHtmlDocument,
  buildThreadJsonDocument,
  buildThreadMarkdownDocument,
  buildThreadTextDocument,
} from '@/utilities/thread-document-export.utility';

export function useThreadPublicPage(
  initialPublication: PublicThreadPublication,
): ThreadPublicPageController {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? '';
  const { t } = useTranslation();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  useEffect(() => {
    // Known only in the browser, so the share menu appears after hydration, never mismatches it.
    setShareUrl(`${window.location.origin}${window.location.pathname}`);
  }, []);
  const queries = useThreadPublicQueries(slug, initialPublication);
  const actions = useThreadPublicActions(slug);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useThreadPublicView(slug, isAuthenticated);
  const error = queries.publication.error;
  const isNotFound = error instanceof ApiClientError && error.status === 404;

  async function buildExportFile(format: ThreadPublicationExportFormat): Promise<ThreadExportFile> {
    const publication = queries.publication.data;
    if (!publication) {
      throw new Error('The Thread is not loaded');
    }
    const file = THREAD_EXPORT_FILES[format];
    const source = {
      title: publication.title,
      markdown: publication.content.markdown,
      citations: publication.content.citations,
      url: shareUrl,
      language: publication.contentLocale,
    };
    const sourcesLabel = t('chat.threadPublicCitations');
    const builders: Partial<Record<ThreadPublicationExportFormat, () => string>> = {
      [ThreadPublicationExportFormat.Markdown]: () =>
        buildThreadMarkdownDocument(source, sourcesLabel),
      [ThreadPublicationExportFormat.Json]: () => buildThreadJsonDocument(source),
      [ThreadPublicationExportFormat.Html]: () => buildThreadHtmlDocument(source, sourcesLabel),
      [ThreadPublicationExportFormat.Text]: () => buildThreadTextDocument(source, sourcesLabel),
    };
    const build = builders[format];
    if (!build) {
      throw new Error('That format is not offered for a public Thread');
    }
    return { format, name: `${slug}.${file.extension}`, mime: file.mime, content: build() };
  }

  return {
    shareUrl,
    buildExportFile,
    publication: queries.publication.data,
    comments: queries.comments.data ?? [],
    reactions: queries.reactions.data,
    isAuthenticated,
    isLoading: queries.publication.isLoading,
    isNotFound,
    isError: queries.publication.isError && !isNotFound,
    communityLoading: queries.comments.isLoading || queries.reactions.isLoading,
    communityError: queries.comments.isError || queries.reactions.isError,
    loginHref: `/login?returnTo=${encodeURIComponent(`/threads/${slug}`)}`,
    actions,
  };
}
