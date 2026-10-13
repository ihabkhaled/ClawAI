import { FileIngestionStatus } from '@/enums';
import type { UploadedFile } from '@/types/file.types';

/** A library file with sensible defaults; override only what the test is about. */
export function makeLibraryFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    id: 'file-1',
    userId: 'user-1',
    filename: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    storagePath: '/files/report.pdf',
    ingestionStatus: FileIngestionStatus.COMPLETED,
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
    ...overrides,
  };
}

/** `count` files, newest id highest, so sort order is observable. */
export function makeLibraryFiles(count: number): UploadedFile[] {
  return Array.from({ length: count }, (_, index) =>
    makeLibraryFile({
      id: `file-${String(index + 1)}`,
      filename: `doc-${String(index + 1)}.pdf`,
      createdAt: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
    }),
  );
}

/** Echoes the key (and params) so a test reads the copy it asked for. */
export function echoTranslate(key: string, params?: Record<string, string | number>): string {
  return params === undefined ? key : `${key}:${Object.values(params).join(',')}`;
}
