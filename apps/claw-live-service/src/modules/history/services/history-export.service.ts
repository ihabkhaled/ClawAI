import { Injectable } from '@nestjs/common';

import { LiveExportFormat } from '../../../common/enums/live-export-format.enum';
import { PdfRenderClient } from '../clients/pdf-render.client';
import {
  EXPORT_FILE_EXTENSIONS,
  EXPORT_MAX_EVENTS,
  EXPORT_MIME_TYPES,
  EXPORT_PAGE_SIZE,
  PDF_MAX_MARKDOWN_CHARS,
} from '../constants/history.constants';
import type { ExportedFile } from '../types/history.types';
import {
  buildMarkdownExport,
  buildTextExport,
  exportFileName,
} from '../utilities/history-export.utility';
import { visibleSourceUrl } from '../utilities/history-view.utility';
import { HistoryService } from './history.service';

/**
 * Builds a downloadable copy of one session's history. Nothing is stored: the bytes go straight back
 * in the response. PDF is the Markdown export rendered by file-generation-service's stateless
 * internal route (Typst), so every script and right-to-left text lays out correctly.
 */
@Injectable()
export class HistoryExportService {
  constructor(
    private readonly history: HistoryService,
    private readonly pdfRenderer: PdfRenderClient,
  ) {}

  async export(userId: string, sessionId: string, format: LiveExportFormat): Promise<ExportedFile> {
    const session = await this.history.requireOwnedSession(userId, sessionId);
    const { events, truncated } = await this.history.collectEvents(
      userId,
      sessionId,
      EXPORT_PAGE_SIZE,
      EXPORT_MAX_EVENTS,
    );
    const document = {
      sessionId,
      title: session.stream.title,
      sourceKind: session.stream.sourceKind,
      sourceUrl: visibleSourceUrl(session.stream, userId),
      startedAt: session.startedAt,
      language: session.language,
      events,
      truncated,
    };
    if (format === LiveExportFormat.PDF) {
      const markdown = buildMarkdownExport(document).slice(0, PDF_MAX_MARKDOWN_CHARS);
      return {
        body: await this.pdfRenderer.render(markdown, session.stream.title),
        mimeType: EXPORT_MIME_TYPES.PDF,
        fileName: exportFileName(sessionId, EXPORT_FILE_EXTENSIONS.PDF),
      };
    }
    const isMarkdown = format === LiveExportFormat.MARKDOWN;
    const text = isMarkdown ? buildMarkdownExport(document) : buildTextExport(document);
    return {
      body: Buffer.from(text, 'utf8'),
      mimeType: isMarkdown ? EXPORT_MIME_TYPES.MARKDOWN : EXPORT_MIME_TYPES.TXT,
      fileName: exportFileName(
        sessionId,
        isMarkdown ? EXPORT_FILE_EXTENSIONS.MARKDOWN : EXPORT_FILE_EXTENSIONS.TXT,
      ),
    };
  }
}
