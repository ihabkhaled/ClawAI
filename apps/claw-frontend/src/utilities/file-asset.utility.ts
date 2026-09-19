import type { FileGenerationAsset } from '@/types/file-generation.types';

/** The newest asset: a rebuild adds one, and it is the one to offer. */
export function latestFileAsset(
  assets: readonly FileGenerationAsset[] | undefined,
): FileGenerationAsset | undefined {
  return [...(assets ?? [])].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )[0];
}

/** True once the server swept the bytes or the hour is up. */
export function isFileAssetExpired(asset: FileGenerationAsset, now: number): boolean {
  if (asset.expiredAt !== null && asset.expiredAt !== undefined) {
    return true;
  }
  return (
    asset.expiresAt !== null &&
    asset.expiresAt !== undefined &&
    new Date(asset.expiresAt).getTime() <= now
  );
}

/** Whole minutes left (rounded down), never below 1 while valid; null when unknown. */
export function fileAssetMinutesLeft(asset: FileGenerationAsset, now: number): number | null {
  if (asset.expiresAt === null || asset.expiresAt === undefined) {
    return null;
  }
  const ms = new Date(asset.expiresAt).getTime() - now;
  // Rounded down: a fresh file says 60, not 61, when the clock is a little behind.
  return ms <= 0 ? 0 : Math.max(1, Math.floor(ms / 60_000));
}
