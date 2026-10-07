import { THREAD_EXPORT_FILES } from '@/constants/thread-publication.constants';
import type { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';

export function threadExportBody(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
}

export function downloadThreadExport(
  format: ThreadPublicationExportFormat,
  content: unknown,
): void {
  const file = THREAD_EXPORT_FILES[format];
  const url = URL.createObjectURL(new Blob([threadExportBody(content)], { type: file.mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `thread-publication.${file.extension}`;
  link.click();
  URL.revokeObjectURL(url);
}
