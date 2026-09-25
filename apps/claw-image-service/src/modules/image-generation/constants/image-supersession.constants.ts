import { ImageAssetRole } from '../../../generated/prisma';

/**
 * How many `supersededById` links one read will follow.
 *
 * A chain grows by at most `IMAGE_AUTO_FALLBACK_MAX_ATTEMPTS` per send plus one
 * per user retry-alternate, so eight covers any realistic card. A longer chain
 * is not an error: the read returns the furthest row it reached, and a reader
 * that asks again from there walks the next eight.
 */
export const IMAGE_SUPERSESSION_MAX_HOPS = 8;

/** Extra providers the AUTO chain may try after the first attempt fails. */
export const IMAGE_AUTO_FALLBACK_MAX_ATTEMPTS = 2;

/**
 * Prisma `include` for the assets a generation PRODUCED. Every read that feeds
 * a response uses it, so a stored reference image never shows up as the
 * generated picture (the card renders `assets[0]`).
 */
export const IMAGE_OUTPUT_ASSETS_INCLUDE = {
  assets: { where: { role: ImageAssetRole.OUTPUT } },
} as const;

/** Error code for a retry aimed at a row another attempt already took over. */
export const IMAGE_GENERATION_SUPERSEDED_CODE = 'IMAGE_GENERATION_SUPERSEDED';
