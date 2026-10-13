import { Braces, FileCode, FileJson, FileText, FileType, type LucideIcon } from 'lucide-react';

import { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';

/** One icon per export format, so each choice is recognisable before it is read. */
export const THREAD_EXPORT_FORMAT_ICONS: Readonly<
  Record<ThreadPublicationExportFormat, LucideIcon>
> = {
  [ThreadPublicationExportFormat.Markdown]: FileText,
  [ThreadPublicationExportFormat.Json]: FileJson,
  [ThreadPublicationExportFormat.Toon]: Braces,
  [ThreadPublicationExportFormat.Html]: FileCode,
  [ThreadPublicationExportFormat.Text]: FileType,
};
