import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ShareAssetAdapter } from '../adapters/share-asset.adapter';
import {
  type PublishableSnapshotMessage,
  type SnapshotAsset,
  type SnapshotMessage,
} from '../types/chat-shares.types';

/**
 * Turns the images a conversation references into share-owned copies.
 *
 * Runs once, at publish time, between selecting the messages and writing them.
 * The private file id never reaches a share table: what gets stored is the id of
 * a permanent copy plus a fresh random `publicAssetId`, which is the only asset
 * identifier a public URL ever carries.
 *
 * Copies are made in parallel per message but sequentially across messages, so a
 * long conversation cannot open a hundred concurrent file reads.
 *
 * See docs/13-adr/adr-075-public-share-assets.md.
 */
@Injectable()
export class ShareAssetPublisherService {
  private readonly logger = new Logger(ShareAssetPublisherService.name);

  constructor(private readonly assets: ShareAssetAdapter) {}

  async attachCopies(
    messages: PublishableSnapshotMessage[],
  ): Promise<PublishableSnapshotMessage[]> {
    const withAssets: PublishableSnapshotMessage[] = [];
    for (const message of messages) {
      withAssets.push({ ...message, assets: await this.copyMessageAssets(message) });
    }

    const copied = withAssets.reduce((total, message) => total + message.assets.length, 0);
    if (copied > 0) {
      this.logger.log(`attachCopies: copied ${String(copied)} image(s) into the share`);
    }
    return withAssets;
  }

  /**
   * Releases every copy a snapshot owns.
   *
   * Called on revoke, on delete, and before a refresh replaces the snapshot.
   * These copies have no retention expiry, so nothing else will ever reclaim
   * them.
   */
  async releaseCopies(storedFileIds: string[]): Promise<void> {
    for (const storedFileId of storedFileIds) {
      await this.assets.deleteCopy(storedFileId);
    }
    if (storedFileIds.length > 0) {
      this.logger.log(`releaseCopies: released ${String(storedFileIds.length)} copied image(s)`);
    }
  }

  private async copyMessageAssets(message: SnapshotMessage): Promise<SnapshotAsset[]> {
    const results = await Promise.all(
      message.assetSources.map(async (source): Promise<SnapshotAsset | null> => {
        const copy = await this.assets.copyForShare(source.sourceFileId);
        if (!copy) return null;
        return {
          sequence: source.sequence,
          publicAssetId: randomUUID(),
          storedFileId: copy.fileId,
          mimeType: copy.mimeType,
          byteSize: copy.byteSize,
          altText: source.altText,
        };
      }),
    );

    // A source that could not be copied is dropped, not faked. Sequences are
    // then re-numbered so the surviving images are contiguous — a gap would show
    // up as a missing slot on the public page.
    return results
      .filter((asset): asset is SnapshotAsset => asset !== null)
      .map((asset, index) => ({ ...asset, sequence: index }));
  }
}
