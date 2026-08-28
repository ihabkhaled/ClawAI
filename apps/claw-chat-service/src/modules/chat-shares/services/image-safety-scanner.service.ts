import { Injectable, Logger } from '@nestjs/common';

import { ChatShareAssetScanStatus } from '../../../generated/prisma';
import { CloudVisionClient } from '../clients/cloud-vision.client';
import { ChatSharesRepository } from '../repositories/chat-shares.repository';
import { ShareAssetAdapter } from '../adapters/share-asset.adapter';
import { describeRejection, isSafeForAdvertising } from '../utilities/safe-search-verdict.utility';

/**
 * Moderates the images in a published share so it can carry advertising.
 *
 * A share containing any unscanned image is published and readable but never ad-
 * or index-eligible. That is the correct default and it is what shipped; this is
 * the piece that lets a clean share out of it.
 *
 * Runs AFTER publish, never during. Publishing must not wait on a third-party
 * moderation API, and it must not fail because that API is down — the share is
 * the user's, the ad decision is ClawAI's, and only the second one depends on
 * the scan.
 */
@Injectable()
export class ImageSafetyScannerService {
  private readonly logger = new Logger(ImageSafetyScannerService.name);

  constructor(
    private readonly vision: CloudVisionClient,
    private readonly shares: ChatSharesRepository,
    private readonly assets: ShareAssetAdapter,
  ) {}

  /**
   * Scans every pending asset in a share, then re-evaluates its eligibility.
   *
   * Deliberately quiet about failure. A share whose images cannot be scanned
   * keeps exactly the standing it already had — readable, not monetised — so
   * there is nothing to tell the user and nothing they could do about it.
   */
  async scanShare(shareId: string, meetsContentThreshold: boolean): Promise<void> {
    if (!this.vision.isConfigured()) {
      // No moderation provider. Leaving the assets PENDING rather than marking
      // them UNAVAILABLE keeps them eligible for a later scan once a key is
      // configured, instead of writing a verdict that was never reached.
      this.logger.debug(`scanShare: no moderation provider configured; share=${shareId} unscanned`);
      return;
    }

    const pending = await this.shares.findPendingAssets(shareId);
    if (pending.length === 0) {
      return;
    }

    for (const asset of pending) {
      const outcome = await this.scanAsset(asset.storedFileId);
      if (!outcome.completed) {
        // Could not classify. UNAVAILABLE is not a rejection: it records that
        // the question was asked and went unanswered.
        await this.shares.recordAssetScan(
          asset.id,
          ChatShareAssetScanStatus.UNAVAILABLE,
          outcome.reason,
        );
        continue;
      }
      await this.shares.recordAssetScan(
        asset.id,
        outcome.approved ? ChatShareAssetScanStatus.APPROVED : ChatShareAssetScanStatus.REJECTED,
        outcome.reason,
      );
    }

    await this.applyEligibility(shareId, meetsContentThreshold);
  }

  /** Fetches the published copy and classifies it. */
  private async scanAsset(
    storedFileId: string,
  ): Promise<{ approved: boolean; reason: string | null; completed: boolean }> {
    const bytes = await this.assets.readPublishedImage(storedFileId);
    if (bytes === null) {
      return { approved: false, reason: 'image unreadable', completed: false };
    }

    const annotation = await this.vision.classify(bytes);
    if (annotation === null) {
      return { approved: false, reason: 'scan unavailable', completed: false };
    }

    const approved = isSafeForAdvertising(annotation);
    return {
      approved,
      reason: approved ? null : describeRejection(annotation),
      completed: true,
    };
  }

  /**
   * Grants eligibility only when every image cleared.
   *
   * The content threshold is passed in rather than recomputed: it is a property
   * of the snapshot that was published, and re-deriving it here would let the
   * two answers drift.
   */
  private async applyEligibility(shareId: string, meetsContentThreshold: boolean): Promise<void> {
    const allApproved = await this.shares.allAssetsApproved(shareId);
    if (!allApproved) {
      this.logger.log(`applyEligibility: share=${shareId} still has unapproved images`);
      return;
    }
    const eligible = meetsContentThreshold;
    await this.shares.setEligibility(shareId, eligible, eligible);
    this.logger.log(
      `applyEligibility: share=${shareId} images cleared; eligibility=${String(eligible)}`,
    );
  }
}
