import { FileGenerationStatus } from '@/enums';
import type { FileGeneration } from '@/types/file-generation.types';

export function getFileStatusLabel(status?: FileGeneration['status']): string {
  switch (status) {
    case FileGenerationStatus.QUEUED:
      return 'Queued';
    case FileGenerationStatus.STARTING:
      return 'Starting';
    case FileGenerationStatus.GENERATING_CONTENT:
      return 'Generating content';
    case FileGenerationStatus.CONVERTING:
      return 'Converting file';
    case FileGenerationStatus.FINALIZING:
      return 'Finalizing';
    case FileGenerationStatus.FAILED:
      return 'File generation failed';
    case FileGenerationStatus.TIMED_OUT:
      return 'Generation timed out';
    case FileGenerationStatus.CANCELLED:
      return 'Generation cancelled';
    case FileGenerationStatus.COMPLETED:
      return 'Completed';
    default:
      return 'Preparing file';
  }
}

export function isTerminalFileStatus(status: FileGenerationStatus): boolean {
  return [
    FileGenerationStatus.COMPLETED,
    FileGenerationStatus.FAILED,
    FileGenerationStatus.TIMED_OUT,
    FileGenerationStatus.CANCELLED,
  ].includes(status);
}

export function formatFileSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isInProgressFileStatus(status: FileGenerationStatus): boolean {
  return [
    FileGenerationStatus.QUEUED,
    FileGenerationStatus.STARTING,
    FileGenerationStatus.GENERATING_CONTENT,
    FileGenerationStatus.CONVERTING,
    FileGenerationStatus.FINALIZING,
  ].includes(status);
}
