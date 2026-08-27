import { PUBLIC_CHAT_SHARE_API_PATH } from '@/constants/chat-share-api.constants';

/**
 * The URL of one published image.
 *
 * Both ids, always together: the asset only resolves through the share that
 * owns it, so this cannot be shortened to an asset-only route. Both are encoded
 * because they arrive from an API response, and a response is not a promise
 * about URL safety.
 */
export function buildPublicShareAssetUrl(publicShareId: string, publicAssetId: string): string {
  return `${PUBLIC_CHAT_SHARE_API_PATH}/${encodeURIComponent(publicShareId)}/assets/${encodeURIComponent(publicAssetId)}`;
}
