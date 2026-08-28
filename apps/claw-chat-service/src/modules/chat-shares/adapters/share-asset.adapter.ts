import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { type Response } from 'express';

import {
  buildInterServiceAuthHeader,
  httpReadBinaryBase64,
  httpRequest,
  httpStreamBinary,
} from '../../../common/utilities';
import { SHARE_ASSET_COPY_TIMEOUT_MS } from '../constants/chat-shares.constants';
import { type ShareAssetCopy } from '../types/chat-shares.types';

/**
 * Copies a user's images into share-owned duplicates, and removes them again.
 *
 * The copy happens inside file-service — this asks for one and receives an id,
 * never bytes. That keeps storage ownership where it belongs and keeps a
 * megabyte-scale payload off the wire.
 *
 * Every method fails soft. Publishing a conversation must not break because one
 * picture could not be copied: losing an image from a public page is a far
 * better outcome than refusing to publish the conversation, and the caller
 * simply gets fewer assets back.
 *
 * See docs/13-adr/adr-075-public-share-assets.md.
 */
@Injectable()
export class ShareAssetAdapter {
  private readonly logger = new Logger(ShareAssetAdapter.name);

  async copyForShare(sourceFileId: string): Promise<ShareAssetCopy | null> {
    try {
      const config = AppConfig.get();
      const response = await httpRequest<ShareAssetCopy | null>({
        url: `${config.FILE_SERVICE_URL}/api/v1/internal/files/publish-copy`,
        method: 'POST',
        headers: { Authorization: buildInterServiceAuthHeader() },
        body: { sourceFileId },
        timeoutMs: SHARE_ASSET_COPY_TIMEOUT_MS,
      });

      if (!response.ok || !response.data) {
        // file-service answers 200 with no body when the source is missing, is
        // not an image, or is oversized. That is a decision, not a failure.
        this.logger.warn(
          `copyForShare: no copy for ${sourceFileId} (status ${String(response.status)})`,
        );
        return null;
      }
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`copyForShare: failed for ${sourceFileId} (non-blocking): ${message}`);
      return null;
    }
  }

  /**
   * Pipes a share-owned copy to a public response.
   *
   * Streamed rather than buffered: an image can be megabytes, and holding one
   * in memory per concurrent viewer is how a popular shared page becomes an
   * outage.
   */
  async streamCopyTo(storedFileId: string, response: Response): Promise<boolean> {
    const config = AppConfig.get();
    return httpStreamBinary({
      url: `${config.FILE_SERVICE_URL}/api/v1/internal/files/download-internal/${encodeURIComponent(storedFileId)}`,
      headers: { Authorization: buildInterServiceAuthHeader() },
      timeoutMs: SHARE_ASSET_COPY_TIMEOUT_MS,
      sink: response,
    });
  }

  /**
   * Reads a share-owned copy into base64, for moderation.
   *
   * Buffered, unlike `streamCopyTo`, and deliberately so: this runs once per
   * image at publish time rather than once per viewer, and Cloud Vision wants
   * the whole image inline. The streaming path exists because a popular shared
   * page would otherwise hold one image in memory per concurrent reader; that
   * pressure does not apply to a single background scan.
   *
   * Returns null on any failure. The caller must not read that as "safe" — an
   * image that could not be fetched is one that was never classified.
   */
  async readPublishedImage(storedFileId: string): Promise<string | null> {
    try {
      const config = AppConfig.get();
      return await httpReadBinaryBase64({
        url: `${config.FILE_SERVICE_URL}/api/v1/internal/files/download-internal/${encodeURIComponent(storedFileId)}`,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: SHARE_ASSET_COPY_TIMEOUT_MS,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`readPublishedImage: failed for ${storedFileId} — ${message}`);
      return null;
    }
  }

  /**
   * Deletes a share-owned copy.
   *
   * The copy carries no retention expiry, so nothing else will ever reap it —
   * this call is the only thing standing between a revoked share and orphaned
   * bytes. Failures are logged loudly for that reason, and still do not throw:
   * a revoke that half-succeeds must still revoke.
   */
  async deleteCopy(storedFileId: string): Promise<void> {
    try {
      const config = AppConfig.get();
      const response = await httpRequest({
        url: `${config.FILE_SERVICE_URL}/api/v1/internal/files/published-copy/${encodeURIComponent(storedFileId)}`,
        method: 'DELETE',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: SHARE_ASSET_COPY_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.error(
          `deleteCopy: file-service refused ${storedFileId} (status ${String(response.status)}); bytes may be orphaned`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `deleteCopy: failed for ${storedFileId}; bytes may be orphaned: ${message}`,
      );
    }
  }
}
