import { ChatShareAssetScanStatus } from '../../../../generated/prisma';
import type { CloudVisionClient } from '../../clients/cloud-vision.client';
import type { ChatSharesRepository } from '../../repositories/chat-shares.repository';
import type { ShareAssetAdapter } from '../../adapters/share-asset.adapter';
import { ImageSafetyScannerService } from '../image-safety-scanner.service';

describe('ImageSafetyScannerService', () => {
  const asset = { id: 'asset-1', storedFileId: 'file-1' };

  function build(overrides: {
    configured?: boolean;
    annotation?: Record<string, string> | null;
    image?: string | null;
    pending?: Array<{ id: string; storedFileId: string }>;
    allApproved?: boolean;
  }) {
    const vision = {
      isConfigured: jest.fn().mockReturnValue(overrides.configured ?? true),
      classify: jest.fn().mockResolvedValue(overrides.annotation ?? null),
    };
    const shares = {
      findPendingAssets: jest.fn().mockResolvedValue(overrides.pending ?? [asset]),
      recordAssetScan: jest.fn().mockResolvedValue(undefined),
      allAssetsApproved: jest.fn().mockResolvedValue(overrides.allApproved ?? true),
      setEligibility: jest.fn().mockResolvedValue(undefined),
    };
    const assets = {
      readPublishedImage: jest
        .fn()
        .mockResolvedValue(overrides.image === undefined ? 'base64' : overrides.image),
    };
    const service = new ImageSafetyScannerService(
      vision as unknown as CloudVisionClient,
      shares as unknown as ChatSharesRepository,
      assets as unknown as ShareAssetAdapter,
    );
    return { service, vision, shares, assets };
  }

  const clean = { adult: 'VERY_UNLIKELY', violence: 'UNLIKELY', racy: 'VERY_UNLIKELY' };

  it('approves a clean image and grants eligibility', () => {
    const { service, shares } = build({ annotation: clean });

    return service.scanShare('share-1', true).then(() => {
      expect(shares.recordAssetScan).toHaveBeenCalledWith(
        'asset-1',
        ChatShareAssetScanStatus.APPROVED,
        null,
      );
      expect(shares.setEligibility).toHaveBeenCalledWith('share-1', true, true);
    });
  });

  it('rejects a flagged image and withholds eligibility', async () => {
    const { service, shares } = build({
      annotation: { ...clean, adult: 'LIKELY' },
      allApproved: false,
    });

    await service.scanShare('share-1', true);

    expect(shares.recordAssetScan).toHaveBeenCalledWith(
      'asset-1',
      ChatShareAssetScanStatus.REJECTED,
      'adult',
    );
    expect(shares.setEligibility).not.toHaveBeenCalled();
  });

  it('records UNAVAILABLE — not REJECTED — when the scan could not run', async () => {
    // The distinction matters: a rejection is a verdict about the image, and
    // "the API was down" is not one. Recording it as a rejection would blame
    // the user's picture for an outage.
    const { service, shares } = build({ annotation: null, allApproved: false });

    await service.scanShare('share-1', true);

    expect(shares.recordAssetScan).toHaveBeenCalledWith(
      'asset-1',
      ChatShareAssetScanStatus.UNAVAILABLE,
      'scan unavailable',
    );
  });

  it('records UNAVAILABLE when the image itself cannot be fetched', async () => {
    const { service, shares, vision } = build({ image: null, allApproved: false });

    await service.scanShare('share-1', true);

    // Never classified, so never approved — and no pointless API call.
    expect(vision.classify).not.toHaveBeenCalled();
    expect(shares.recordAssetScan).toHaveBeenCalledWith(
      'asset-1',
      ChatShareAssetScanStatus.UNAVAILABLE,
      'image unreadable',
    );
  });

  it('leaves assets PENDING when no moderation provider is configured', async () => {
    // Writing a verdict nobody reached would bar them from a later scan once a
    // key is configured.
    const { service, shares } = build({ configured: false });

    await service.scanShare('share-1', true);

    expect(shares.findPendingAssets).not.toHaveBeenCalled();
    expect(shares.recordAssetScan).not.toHaveBeenCalled();
    expect(shares.setEligibility).not.toHaveBeenCalled();
  });

  it('withholds eligibility from a thin share even when the images are clean', async () => {
    // Passing the scan is necessary, not sufficient: a two-line conversation is
    // still not worth indexing.
    const { service, shares } = build({ annotation: clean });

    await service.scanShare('share-1', false);

    expect(shares.setEligibility).toHaveBeenCalledWith('share-1', false, false);
  });

  it('does nothing when there is nothing pending', async () => {
    const { service, shares } = build({ pending: [] });

    await service.scanShare('share-1', true);

    expect(shares.recordAssetScan).not.toHaveBeenCalled();
    expect(shares.setEligibility).not.toHaveBeenCalled();
  });
});
