// Owns the operational concerns of the Gemini Files API:
//   - Uploading raw bytes with the documented resumable start/finalize protocol.
//   - Caching file URIs by stable file ID.
//   - Bounding concurrent uploads with a cancellable in-memory semaphore.
//   - Polling uploaded videos until Gemini reports them ACTIVE.

import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { GeminiUploadPhase } from '../../../common/enums';
import {
  GEMINI_FILE_RESOURCE_NAME_PATTERN,
  GEMINI_FILES_API_BASE_URL,
  GEMINI_FILES_API_POLL_INTERVAL_MS,
  GEMINI_FILES_API_QUOTA_EXCEEDED_STATUS,
  GEMINI_FILES_API_RATE_LIMITED_STATUS,
  GEMINI_GENERATE_CONTENT_BASE_URL,
  GEMINI_VIDEO_MIME_PREFIX,
} from '../constants/gemini-files-api.constants';
import type {
  GeminiFileResource,
  GeminiFilesApiCacheEntry,
  GeminiFilesApiResponseBody,
  GeminiFilesApiUploadResult,
  GeminiFileState,
} from '../types/gemini.types';

@Injectable()
export class GeminiFilesApiManager {
  private readonly logger = new Logger(GeminiFilesApiManager.name);

  private readonly cache = new Map<string, GeminiFilesApiCacheEntry>();

  private activeUploads = 0;
  private readonly uploadQueue: Array<() => void> = [];

  async uploadFile(
    data: Buffer,
    mimeType: string,
    displayName: string,
    apiKeyOverride?: string,
    abortSignal?: AbortSignal,
  ): Promise<GeminiFilesApiUploadResult> {
    this.logger.debug(
      `uploadFile: scheduling upload sizeBytes=${String(data.length)} mimeType=${mimeType} displayName=${displayName}`,
    );
    const apiKey = this.resolveApiKey(apiKeyOverride);
    if (apiKey.length === 0) {
      throw new BusinessException(
        'A connector API key is required for Gemini Files API uploads',
        'GEMINI_FILES_API_MISSING_KEY',
      );
    }

    const controller = new AbortController();
    const onExternalAbort = (): void => controller.abort();
    abortSignal?.addEventListener('abort', onExternalAbort, { once: true });
    if (abortSignal?.aborted === true) {
      controller.abort();
    }
    const timeout = setTimeout(
      () => controller.abort(),
      AppConfig.get().GEMINI_FILES_API_TIMEOUT_MS,
    );
    const startTime = Date.now();
    let acquiredSlot = false;

    try {
      await this.acquireSlot(controller.signal);
      acquiredSlot = true;
      return await this.performUpload(
        data,
        mimeType,
        displayName,
        apiKey,
        controller.signal,
        startTime,
      );
    } catch (error: unknown) {
      if (abortSignal?.aborted === true) {
        throw this.buildCancellationError();
      }
      if (controller.signal.aborted) {
        throw this.buildUploadTimeout(mimeType);
      }
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      this.logger.error(
        `uploadFile: failed after ${String(Date.now() - startTime)}ms - ${message}`,
      );
      throw error;
    } finally {
      clearTimeout(timeout);
      abortSignal?.removeEventListener('abort', onExternalAbort);
      if (acquiredSlot) {
        this.releaseSlot();
      }
    }
  }

  async getCachedOrUpload(
    fileId: string,
    data: Buffer,
    mimeType: string,
    apiKeyOverride?: string,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const config = AppConfig.get();
    if (config.GEMINI_FILES_API_CACHE_ENABLED) {
      const cached = this.cache.get(fileId);
      if (cached !== undefined && cached.expiresAt.getTime() > Date.now()) {
        this.logger.debug(`getCachedOrUpload: cache hit fileId=${fileId}`);
        return cached.fileUri;
      }
      if (cached !== undefined) {
        this.logger.debug(`getCachedOrUpload: cache expired fileId=${fileId}`);
        this.cache.delete(fileId);
      }
    }

    const uploaded = await this.uploadFile(data, mimeType, fileId, apiKeyOverride, abortSignal);
    this.cache.set(fileId, {
      fileUri: uploaded.fileUri,
      uploadedAt: new Date(),
      expiresAt: uploaded.expiresAt,
      sizeBytes: uploaded.sizeBytes,
      mimeType: uploaded.mimeType,
    });
    this.logger.log(
      `getCachedOrUpload: cached fileId=${fileId} expiresAt=${uploaded.expiresAt.toISOString()}`,
    );
    return uploaded.fileUri;
  }

  private async performUpload(
    data: Buffer,
    mimeType: string,
    displayName: string,
    apiKey: string,
    signal: AbortSignal,
    startTime: number,
  ): Promise<GeminiFilesApiUploadResult> {
    const uploadUrl = await this.startResumableUpload(
      data.length,
      mimeType,
      displayName,
      apiKey,
      signal,
    );
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: this.buildFinalizeHeaders(data.length, mimeType, apiKey),
      body: this.bufferToBodyInit(data),
      signal,
    });
    const uploaded = await this.parseUploadResponse(response, data.length, mimeType, startTime);
    return this.waitForVideoProcessing(uploaded, apiKey, signal);
  }

  private async startResumableUpload(
    sizeBytes: number,
    mimeType: string,
    displayName: string,
    apiKey: string,
    signal: AbortSignal,
  ): Promise<string> {
    const response = await fetch(GEMINI_FILES_API_BASE_URL, {
      method: 'POST',
      headers: this.buildStartHeaders(sizeBytes, mimeType, apiKey),
      body: JSON.stringify({ file: { display_name: displayName } }),
      signal,
    });
    if (!response.ok) {
      await this.throwUploadResponseError(response, GeminiUploadPhase.START);
    }
    const uploadUrl = response.headers.get('x-goog-upload-url')?.trim() ?? '';
    return this.validateUploadSessionUrl(uploadUrl);
  }

  private buildStartHeaders(
    sizeBytes: number,
    mimeType: string,
    apiKey: string,
  ): Record<string, string> {
    return {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(sizeBytes),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    };
  }

  private buildFinalizeHeaders(
    sizeBytes: number,
    mimeType: string,
    apiKey: string,
  ): Record<string, string> {
    return {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Length': String(sizeBytes),
      'Content-Type': mimeType,
    };
  }

  private resolveApiKey(apiKeyOverride: string | undefined): string {
    return apiKeyOverride?.trim() ?? '';
  }

  private bufferToBodyInit(data: Buffer): Uint8Array {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  private async parseUploadResponse(
    response: Response,
    sizeBytes: number,
    mimeType: string,
    startTime: number,
  ): Promise<GeminiFilesApiUploadResult> {
    const durationMs = Date.now() - startTime;
    if (!response.ok) {
      await this.throwUploadResponseError(response, GeminiUploadPhase.FINALIZE, durationMs);
    }

    const payload = (await response.json().catch(() => ({}))) as GeminiFilesApiResponseBody;
    const fileUri = payload.file?.uri?.trim() ?? '';
    if (fileUri.length === 0) {
      throw new BusinessException(
        'Gemini Files API succeeded but returned no file URI',
        'GEMINI_FILES_API_MISSING_URI',
      );
    }

    const expiresAt = this.resolveExpiresAt(
      payload.file?.expirationTime,
      AppConfig.get().GEMINI_FILES_API_TTL_MINUTES,
    );
    this.logger.log(
      `parseUploadResponse: uploaded sizeBytes=${String(sizeBytes)} mimeType=${mimeType} durationMs=${String(durationMs)}`,
    );
    return {
      fileUri,
      fileName: payload.file?.name,
      state: payload.file?.state,
      expiresAt,
      sizeBytes,
      mimeType,
    };
  }

  private async throwUploadResponseError(
    response: Response,
    phase: GeminiUploadPhase,
    durationMs = 0,
  ): Promise<never> {
    const errorBody = await response.text().catch(() => '');
    this.logger.error(
      `Files API ${phase} returned status=${String(response.status)} durationMs=${String(durationMs)} body=${errorBody.slice(0, 256)}`,
    );
    if (
      response.status === GEMINI_FILES_API_RATE_LIMITED_STATUS ||
      response.status === GEMINI_FILES_API_QUOTA_EXCEEDED_STATUS
    ) {
      throw new BusinessException(
        `Gemini Files API rate limited (status=${String(response.status)})`,
        'GEMINI_FILES_API_RATE_LIMITED',
      );
    }
    throw new BusinessException(
      `Gemini Files API upload failed (status=${String(response.status)})`,
      'GEMINI_FILES_API_UPLOAD_FAILED',
    );
  }

  private validateUploadSessionUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'https:' || parsed.hostname !== 'generativelanguage.googleapis.com') {
        throw new Error('Untrusted upload session URL');
      }
      return parsed.toString();
    } catch {
      throw new BusinessException(
        'Gemini Files API did not return a trusted upload session URL',
        'GEMINI_FILES_API_MISSING_UPLOAD_URL',
      );
    }
  }

  private async waitForVideoProcessing(
    uploaded: GeminiFilesApiUploadResult,
    apiKey: string,
    signal: AbortSignal,
  ): Promise<GeminiFilesApiUploadResult> {
    if (!uploaded.mimeType.startsWith(GEMINI_VIDEO_MIME_PREFIX)) {
      return uploaded;
    }
    const fileName = uploaded.fileName?.trim() ?? '';
    if (!GEMINI_FILE_RESOURCE_NAME_PATTERN.test(fileName)) {
      throw new BusinessException(
        'Gemini Files API returned an invalid video file name',
        'GEMINI_FILES_API_INVALID_NAME',
      );
    }

    let state = uploaded.state ?? 'STATE_UNSPECIFIED';
    while (state !== 'ACTIVE') {
      this.throwIfVideoProcessingFailed(state, fileName);
      await this.waitForNextVideoPoll(signal);
      state = await this.fetchFileState(fileName, apiKey, signal);
    }
    return { ...uploaded, state };
  }

  private throwIfVideoProcessingFailed(state: GeminiFileState, fileName: string): void {
    if (state === 'FAILED') {
      throw new BusinessException(
        `Gemini Files API failed to process video ${fileName}`,
        'GEMINI_FILES_API_PROCESSING_FAILED',
      );
    }
  }

  private async fetchFileState(
    fileName: string,
    apiKey: string,
    signal: AbortSignal,
  ): Promise<GeminiFileState> {
    const response = await fetch(`${GEMINI_GENERATE_CONTENT_BASE_URL}/${fileName}`, {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
      signal,
    });
    if (!response.ok) {
      throw new BusinessException(
        `Gemini Files API status check failed (status=${String(response.status)})`,
        'GEMINI_FILES_API_STATUS_FAILED',
      );
    }
    const file = (await response.json().catch(() => ({}))) as GeminiFileResource;
    return file.state ?? 'STATE_UNSPECIFIED';
  }

  private async waitForNextVideoPoll(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      throw this.buildVideoProcessingTimeout();
    }
    await new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        reject(this.buildVideoProcessingTimeout());
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, GEMINI_FILES_API_POLL_INTERVAL_MS);
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
      }
    });
  }

  private buildVideoProcessingTimeout(): BusinessException {
    return new BusinessException(
      'Gemini Files API timed out while processing the uploaded video',
      'GEMINI_FILES_API_PROCESSING_TIMEOUT',
    );
  }

  private buildUploadTimeout(mimeType: string): BusinessException {
    if (mimeType.startsWith(GEMINI_VIDEO_MIME_PREFIX)) {
      return this.buildVideoProcessingTimeout();
    }
    return new BusinessException(
      'Gemini Files API upload timed out',
      'GEMINI_FILES_API_UPLOAD_TIMEOUT',
    );
  }

  private buildCancellationError(): BusinessException {
    return new BusinessException('Gemini file upload cancelled', 'STREAM_CANCELLED');
  }

  private resolveExpiresAt(serverExpiration: string | undefined, ttlMinutes: number): Date {
    if (serverExpiration !== undefined && serverExpiration.length > 0) {
      const parsed = new Date(serverExpiration);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date(Date.now() + ttlMinutes * 60 * 1000);
  }

  private async acquireSlot(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      throw this.buildCancellationError();
    }
    if (this.activeUploads < AppConfig.get().GEMINI_CONCURRENT_UPLOADS_LIMIT) {
      this.activeUploads++;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const grantSlot = (): void => {
        signal.removeEventListener('abort', removeQueuedUpload);
        this.activeUploads++;
        resolve();
      };
      const removeQueuedUpload = (): void => {
        const queueIndex = this.uploadQueue.indexOf(grantSlot);
        if (queueIndex >= 0) {
          this.uploadQueue.splice(queueIndex, 1);
        }
        signal.removeEventListener('abort', removeQueuedUpload);
        reject(this.buildCancellationError());
      };
      this.uploadQueue.push(grantSlot);
      signal.addEventListener('abort', removeQueuedUpload, { once: true });
      if (signal.aborted) {
        removeQueuedUpload();
      }
    });
  }

  private releaseSlot(): void {
    this.activeUploads--;
    const next = this.uploadQueue.shift();
    if (next !== undefined) {
      next();
    }
  }
}
