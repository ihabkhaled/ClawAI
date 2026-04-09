import { ImageGenerationStatus } from '@/enums';
import type { ImageGeneration } from '@/types/image-generation.types';

export function getImageStatusLabel(status?: ImageGeneration['status']): string {
  switch (status) {
    case ImageGenerationStatus.QUEUED:
      return 'Queued';
    case ImageGenerationStatus.STARTING:
      return 'Starting';
    case ImageGenerationStatus.GENERATING:
      return 'Generating image';
    case ImageGenerationStatus.FINALIZING:
      return 'Finalizing image';
    case ImageGenerationStatus.FAILED:
      return 'Generation failed';
    case ImageGenerationStatus.TIMED_OUT:
      return 'Generation timed out';
    case ImageGenerationStatus.CANCELLED:
      return 'Generation cancelled';
    case ImageGenerationStatus.COMPLETED:
      return 'Completed';
    default:
      return 'Preparing image';
  }
}

export function resolveImageUrl(url: string, apiBaseUrl: string): string {
  if (url.startsWith('/api/')) {
    return `${apiBaseUrl.replace('/api/v1', '')}${url}`;
  }
  return url;
}

export function isTerminalImageStatus(status: ImageGenerationStatus): boolean {
  return [
    ImageGenerationStatus.COMPLETED,
    ImageGenerationStatus.FAILED,
    ImageGenerationStatus.TIMED_OUT,
    ImageGenerationStatus.CANCELLED,
  ].includes(status);
}

export function isInProgressImageStatus(status: ImageGenerationStatus): boolean {
  return [
    ImageGenerationStatus.QUEUED,
    ImageGenerationStatus.STARTING,
    ImageGenerationStatus.GENERATING,
    ImageGenerationStatus.FINALIZING,
  ].includes(status);
}
