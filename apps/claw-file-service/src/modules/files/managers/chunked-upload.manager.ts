import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import {
  CHUNKED_UPLOAD_ID_PATTERN,
  CHUNKED_UPLOAD_MANIFEST_FILE,
  CHUNKED_UPLOAD_MAX_CHUNK_BYTES,
  CHUNKED_UPLOAD_SESSION_DIR,
  CHUNKED_UPLOAD_SESSION_TTL_MS,
} from '../constants/chunked-upload.constants';
import {
  type ChunkedUploadAbortResult,
  type ChunkedUploadManifest,
  type ChunkedUploadStatus,
} from '../types/chunked-upload.types';

/**
 * Chunked-upload sessions, stored on disk under
 * `<FILE_STORAGE_PATH>/.chunk-sessions/<uploadId>/`.
 *
 * There is no new Prisma model here on purpose: a session is transient
 * (minutes, not the lifetime data a `File` row represents), and a migration
 * against a database this worktree has no running connection to is not
 * something this change can prove safe. The manifest on disk is the single
 * source of truth for a session and survives a service restart; it does NOT
 * survive being served from a second file-service replica, which is fine
 * today — file-service is not on the safe-to-scale list (see chat-service
 * replicas memory note) and keeps `container_name` like the rest.
 *
 * Every chunk is written to its own file; `complete()` is the ONLY place that
 * concatenates them and hands the reassembled buffer to the same security
 * pipeline a single-shot upload goes through (magic bytes, zip-bomb, AV) — a
 * malicious payload split across chunk boundaries is still scanned whole.
 */
@Injectable()
export class ChunkedUploadManager {
  private readonly logger = new Logger(ChunkedUploadManager.name);

  private sessionsRoot(): string {
    return path.resolve(AppConfig.get().FILE_STORAGE_PATH, CHUNKED_UPLOAD_SESSION_DIR);
  }

  /**
   * The ONE place a filesystem path is built from request data (upload id,
   * chunk index). Every fs call in this class takes its path from here.
   *
   * The DTO already checks the upload id, but CodeQL js/path-injection (and a
   * future caller that skips the DTO) cannot see that, so the guard lives next
   * to the fs call: a strict id/index shape first, then path.resolve plus a
   * startsWith(root + sep) check on the exact value handed to fs.
   */
  private resolveSessionPath(uploadId: string, fileName?: string): string {
    if (!CHUNKED_UPLOAD_ID_PATTERN.test(uploadId)) {
      throw new BusinessException('Invalid upload id', 'INVALID_UPLOAD_ID', HttpStatus.BAD_REQUEST);
    }
    const root = this.sessionsRoot();
    const resolved =
      fileName === undefined
        ? path.resolve(root, uploadId)
        : path.resolve(root, uploadId, fileName);
    if (!resolved.startsWith(root + path.sep)) {
      throw new BusinessException(
        'Upload path escapes the session directory',
        'INVALID_UPLOAD_PATH',
        HttpStatus.BAD_REQUEST,
      );
    }
    return resolved;
  }

  private sessionDir(uploadId: string): string {
    return this.resolveSessionPath(uploadId);
  }

  private manifestPath(uploadId: string): string {
    return this.resolveSessionPath(uploadId, CHUNKED_UPLOAD_MANIFEST_FILE);
  }

  private chunkPath(uploadId: string, index: number): string {
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new BusinessException(
        `Chunk index ${String(index)} is not a non-negative integer`,
        'CHUNK_INDEX_OUT_OF_RANGE',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.resolveSessionPath(uploadId, `chunk-${String(index)}.bin`);
  }

  private readManifest(uploadId: string): ChunkedUploadManifest {
    const manifestFile = this.manifestPath(uploadId);
    if (!fs.existsSync(manifestFile)) {
      throw new EntityNotFoundException('UploadSession', uploadId);
    }
    const raw = fs.readFileSync(manifestFile, 'utf8');
    return JSON.parse(raw) as ChunkedUploadManifest;
  }

  private writeManifest(manifest: ChunkedUploadManifest): void {
    fs.writeFileSync(this.manifestPath(manifest.uploadId), JSON.stringify(manifest));
  }

  private assertOwner(manifest: ChunkedUploadManifest, userId: string): void {
    if (manifest.userId !== userId) {
      // Same response as "doesn't exist" — an upload session belonging to
      // another user must not be distinguishable from a missing one.
      throw new EntityNotFoundException('UploadSession', manifest.uploadId);
    }
  }

  /** Best-effort sweep of sessions abandoned past CHUNKED_UPLOAD_SESSION_TTL_MS. */
  private sweepExpired(): void {
    const root = this.sessionsRoot();
    if (!fs.existsSync(root)) {
      return;
    }
    const now = Date.now();
    for (const entry of fs.readdirSync(root)) {
      try {
        const manifest = this.readManifest(entry);
        if (now - new Date(manifest.createdAt).getTime() > CHUNKED_UPLOAD_SESSION_TTL_MS) {
          this.cleanup(entry);
        }
      } catch (error) {
        this.logger.warn(
          `sweepExpired: skipping "${entry}" — ${error instanceof Error ? error.message : 'unreadable manifest'}`,
        );
      }
    }
  }

  init(
    userId: string,
    args: { filename: string; mimeType: string; sizeBytes: number; totalChunks: number },
  ): ChunkedUploadStatus {
    this.sweepExpired();
    const uploadId = crypto.randomUUID();
    fs.mkdirSync(this.sessionDir(uploadId), { recursive: true });
    const manifest: ChunkedUploadManifest = {
      uploadId,
      userId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      totalChunks: args.totalChunks,
      receivedChunks: [],
      createdAt: new Date().toISOString(),
    };
    this.writeManifest(manifest);
    this.logger.log(
      `init: opened upload session ${uploadId} for "${args.filename}" (${String(args.totalChunks)} chunks)`,
    );
    return { uploadId, totalChunks: manifest.totalChunks, receivedChunks: [], complete: false };
  }

  receiveChunk(
    userId: string,
    uploadId: string,
    index: number,
    base64Content: string,
  ): ChunkedUploadStatus {
    const manifest = this.readManifest(uploadId);
    this.assertOwner(manifest, userId);
    if (index < 0 || index >= manifest.totalChunks) {
      throw new BusinessException(
        `Chunk index ${String(index)} is outside session bounds (0..${String(manifest.totalChunks - 1)})`,
        'CHUNK_INDEX_OUT_OF_RANGE',
        HttpStatus.BAD_REQUEST,
      );
    }
    const buffer = Buffer.from(base64Content, 'base64');
    if (buffer.length > CHUNKED_UPLOAD_MAX_CHUNK_BYTES) {
      throw new BusinessException(
        `Chunk exceeds ${String(CHUNKED_UPLOAD_MAX_CHUNK_BYTES)} bytes`,
        'CHUNK_TOO_LARGE',
        HttpStatus.BAD_REQUEST,
      );
    }
    fs.writeFileSync(this.chunkPath(uploadId, index), buffer);
    if (!manifest.receivedChunks.includes(index)) {
      manifest.receivedChunks.push(index);
      manifest.receivedChunks.sort((a, b) => a - b);
      this.writeManifest(manifest);
    }
    const complete = manifest.receivedChunks.length === manifest.totalChunks;
    return {
      uploadId,
      totalChunks: manifest.totalChunks,
      receivedChunks: manifest.receivedChunks,
      complete,
    };
  }

  getStatus(userId: string, uploadId: string): ChunkedUploadStatus {
    const manifest = this.readManifest(uploadId);
    this.assertOwner(manifest, userId);
    return {
      uploadId,
      totalChunks: manifest.totalChunks,
      receivedChunks: manifest.receivedChunks,
      complete: manifest.receivedChunks.length === manifest.totalChunks,
    };
  }

  /** Reassembles every chunk in order and returns the manifest + the whole buffer. Caller finalizes and calls cleanup(). */
  reassemble(
    userId: string,
    uploadId: string,
  ): { manifest: ChunkedUploadManifest; buffer: Buffer } {
    const manifest = this.readManifest(uploadId);
    this.assertOwner(manifest, userId);
    if (manifest.receivedChunks.length !== manifest.totalChunks) {
      throw new BusinessException(
        `Upload session ${uploadId} is missing ${String(manifest.totalChunks - manifest.receivedChunks.length)} chunk(s)`,
        'CHUNKED_UPLOAD_INCOMPLETE',
        HttpStatus.CONFLICT,
      );
    }
    const parts: Buffer[] = [];
    for (let index = 0; index < manifest.totalChunks; index += 1) {
      parts.push(fs.readFileSync(this.chunkPath(uploadId, index)));
    }
    const buffer = Buffer.concat(parts);
    if (buffer.length !== manifest.sizeBytes) {
      throw new BusinessException(
        `Reassembled size ${String(buffer.length)} does not match declared size ${String(manifest.sizeBytes)}`,
        'FILE_SIZE_MISMATCH',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { manifest, buffer };
  }

  /**
   * The owner walked away mid-upload (removed the chip, cancelled): drop the
   * session and every chunk written so far, now instead of at TTL.
   *
   * Idempotent and enumeration-safe: a missing, expired, already-completed or
   * someone else's session all answer `aborted: false`, and a stranger's
   * session is left untouched. A chunk that lands after this finds no manifest
   * and gets the ordinary 404.
   */
  abort(userId: string, uploadId: string): ChunkedUploadAbortResult {
    let manifest: ChunkedUploadManifest;
    try {
      manifest = this.readManifest(uploadId);
    } catch {
      return { uploadId, aborted: false };
    }
    if (manifest.userId !== userId) {
      return { uploadId, aborted: false };
    }
    this.cleanup(uploadId);
    this.logger.log(
      `abort: dropped upload session ${uploadId} (${String(manifest.receivedChunks.length)}/${String(manifest.totalChunks)} chunks received)`,
    );
    return { uploadId, aborted: true };
  }

  cleanup(uploadId: string): void {
    const dir = this.sessionDir(uploadId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}
