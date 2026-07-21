// Owns the operational concerns of the Gemini Files API:
//   - Uploading raw bytes via the Files API (raw upload, single POST).
//   - Caching the resulting file_uri keyed by a stable fileId so a single
//     attachment uploaded once is reused across compare / judge / critic lanes.
//   - Bounding concurrent uploads with an in-memory semaphore so we don't
//     fan-out 20 uploads at once and trip Google's per-minute quota.
//   - Falling back to inline_data when the API returns a rate-limit / quota
//     error AND the payload is still under the inline ceiling.
//
// Pure wire I/O via global fetch (no JSON wrapper — the API expects raw bytes
// with `X-Goog-Upload-*` headers), so this manager intentionally does NOT
// use httpRequest from common/utilities.

import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import {
  GEMINI_FILES_API_BASE_URL,
  GEMINI_FILES_API_QUOTA_EXCEEDED_STATUS,
  GEMINI_FILES_API_RATE_LIMITED_STATUS,
} from '../constants/gemini-files-api.constants';
import type {
  GeminiFilesApiCacheEntry,
  GeminiFilesApiResponseBody,
  GeminiFilesApiUploadResult,
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
  ): Promise<GeminiFilesApiUploadResult> {
    this.logger.debug(
      `uploadFile: scheduling upload sizeBytes=${String(data.length)} mimeType=${mimeType} displayName=${displayName}`,
    );
    await this.acquireSlot();
    try {
      return await this.performUpload(data, mimeType, displayName);
    } finally {
      this.releaseSlot();
    }
  }

  async getCachedOrUpload(fileId: string, data: Buffer, mimeType: string): Promise<string> {
    const config = AppConfig.get();
    if (config.GEMINI_FILES_API_CACHE_ENABLED) {
      const cached = this.cache.get(fileId);
      if (cached !== undefined && cached.expiresAt.getTime() > Date.now()) {
        this.logger.debug(
          `getCachedOrUpload: cache hit fileId=${fileId} fileUri=${cached.fileUri}`,
        );
        return cached.fileUri;
      }
      if (cached !== undefined) {
        this.logger.debug(`getCachedOrUpload: cache expired fileId=${fileId} — re-uploading`);
        this.cache.delete(fileId);
      }
    }

    const uploaded = await this.uploadFile(data, mimeType, fileId);
    this.cache.set(fileId, {
      fileUri: uploaded.fileUri,
      uploadedAt: new Date(),
      expiresAt: uploaded.expiresAt,
      sizeBytes: uploaded.sizeBytes,
      mimeType: uploaded.mimeType,
    });
    this.logger.log(
      `getCachedOrUpload: cached fileId=${fileId} fileUri=${uploaded.fileUri} expiresAt=${uploaded.expiresAt.toISOString()}`,
    );
    return uploaded.fileUri;
  }

  private async performUpload(
    data: Buffer,
    mimeType: string,
    displayName: string,
  ): Promise<GeminiFilesApiUploadResult> {
    const config = AppConfig.get();
    const apiKey = process.env['GEMINI_API_KEY'] ?? '';
    if (!apiKey) {
      throw new BusinessException(
        'GEMINI_API_KEY is not configured — Gemini Files API upload cannot proceed',
        'GEMINI_FILES_API_MISSING_KEY',
      );
    }

    const url = `${GEMINI_FILES_API_BASE_URL}?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.GEMINI_FILES_API_TIMEOUT_MS);
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildUploadHeaders(data.length, mimeType, displayName),
        body: this.bufferToBodyInit(data),
        signal: controller.signal,
      });
      return await this.parseUploadResponse(response, data.length, mimeType, startTime);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      this.logger.error(
        `performUpload: failed after ${String(Date.now() - startTime)}ms — ${message}`,
      );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUploadHeaders(
    sizeBytes: number,
    mimeType: string,
    displayName: string,
  ): Record<string, string> {
    return {
      'X-Goog-Upload-Protocol': 'raw',
      'X-Goog-Upload-Header-Content-Length': String(sizeBytes),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'X-Goog-Upload-File-Name': displayName,
      'Content-Type': mimeType,
    };
  }

  // fetch's BodyInit accepts ArrayBuffer/Uint8Array directly; we copy into a
  // fresh Uint8Array view so the buffer's offset/length are honoured exactly.
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
      const errorBody = await response.text().catch(() => '');
      this.logger.error(
        `parseUploadResponse: Files API returned status=${String(response.status)} durationMs=${String(durationMs)} body=${errorBody.slice(0, 256)}`,
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

    const payload = (await response.json().catch(() => ({}))) as GeminiFilesApiResponseBody;
    const fileUri = payload.file?.uri?.trim() ?? '';
    if (!fileUri) {
      this.logger.error(
        `parseUploadResponse: Files API succeeded but returned no file.uri — payload=${JSON.stringify(payload).slice(0, 256)}`,
      );
      throw new BusinessException(
        'Gemini Files API succeeded but returned no file URI',
        'GEMINI_FILES_API_MISSING_URL',
      );
    }

    const config = AppConfig.get();
    const expiresAt = this.resolveExpiresAt(
      payload.file?.expirationTime,
      config.GEMINI_FILES_API_TTL_MINUTES,
    );
    this.logger.log(
      `parseUploadResponse: uploaded sizeBytes=${String(sizeBytes)} mimeType=${mimeType} fileUri=${fileUri} expiresAt=${expiresAt.toISOString()} durationMs=${String(durationMs)}`,
    );
    return {
      fileUri,
      expiresAt,
      sizeBytes,
      mimeType,
    };
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

  private async acquireSlot(): Promise<void> {
    const config = AppConfig.get();
    if (this.activeUploads < config.GEMINI_CONCURRENT_UPLOADS_LIMIT) {
      this.activeUploads++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.uploadQueue.push(() => {
        this.activeUploads++;
        resolve();
      });
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
