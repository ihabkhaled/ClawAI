import { Logger } from '@nestjs/common';

import { AppConfig } from '../../app/config/app.config';
import { FILE_SERVICE_HTTP_TIMEOUT_MS } from '../constants/file-service-client.constants';
import type { FileServiceMetadata, UploadInternalInput } from '../types/file-service-client.types';

export type { FileServiceMetadata, UploadInternalInput } from '../types/file-service-client.types';

const logger = new Logger('FileServiceClient');

/**
 * Stream 22 — service-to-service client for claw-file-service. Uses the
 * INTER_SERVICE_AUTH_TOKEN shared secret on `Authorization: Service <token>`.
 * Wrap-don't-inline: every workspace-side caller goes through these functions.
 */
export async function uploadInternal(input: UploadInternalInput): Promise<string> {
  const config = AppConfig.get();
  const url = `${config.FILE_SERVICE_URL}/api/v1/internal/files/upload-internal`;
  const body = {
    userId: input.userId,
    filename: input.filename,
    mimeType: input.mimeType,
    contentBase64: input.content.toString('base64'),
    sourceWorkspaceObjectId: input.sourceWorkspaceObjectId,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FILE_SERVICE_HTTP_TIMEOUT_MS),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `file-service upload-internal ${String(response.status)}: ${text.slice(0, 200)}`,
    );
  }
  const json = (await response.json()) as { fileId?: string };
  if (json.fileId === undefined) {
    throw new Error('file-service upload-internal returned no fileId');
  }
  return json.fileId;
}

export async function getMetadata(fileId: string): Promise<FileServiceMetadata | null> {
  const config = AppConfig.get();
  const url = `${config.FILE_SERVICE_URL}/api/v1/internal/files/metadata-internal/${encodeURIComponent(fileId)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
    signal: AbortSignal.timeout(FILE_SERVICE_HTTP_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    logger.warn(`getMetadata: HTTP ${String(response.status)} for fileId=${fileId}`);
    return null;
  }
  return (await response.json()) as FileServiceMetadata;
}

export function buildDownloadUrl(fileId: string): string {
  const config = AppConfig.get();
  return `${config.FILE_SERVICE_URL}/api/v1/internal/files/download-internal/${encodeURIComponent(fileId)}`;
}

export function buildAuthHeader(): string {
  return `Service ${AppConfig.get().INTER_SERVICE_AUTH_TOKEN}`;
}
