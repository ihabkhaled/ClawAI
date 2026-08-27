import type { PublicSharedAssetsProps } from '@/types';
import { buildPublicShareAssetUrl } from '@/utilities/public-share-asset.utility';

/**
 * The images published with a shared message.
 *
 * Rendered from the share's own asset list rather than from markdown `img`
 * tags. That distinction is the security boundary: the markdown renderer still
 * refuses every `img` in message text, because that URL would be attacker-chosen
 * and would leak the reader's IP to whatever host it named. These come from a
 * share-scoped route on our own origin, resolved only through the share that
 * owns them.
 *
 * Plain `<img>` rather than `next/image`: the optimiser would have to be allowed
 * to fetch from the share route, which means giving it a URL pattern that any
 * share id satisfies, and the benefit does not pay for widening that surface.
 *
 * See docs/13-adr/adr-075-public-share-assets.md.
 */
export function PublicSharedAssets({
  publicShareId,
  assets,
  imageLabel,
}: PublicSharedAssetsProps): React.ReactElement | null {
  if (assets.length === 0) {
    return null;
  }

  return (
    <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {assets.map((asset) => (
        <li key={asset.publicAssetId} className="border-border overflow-hidden rounded-lg border">
          {/* `loading="lazy"` because a long conversation can carry many images
              and none of them is the reason the page was opened.
              `referrerPolicy="no-referrer"` keeps the share URL out of any
              downstream log. */}
          <img
            src={buildPublicShareAssetUrl(publicShareId, asset.publicAssetId)}
            alt={asset.altText ?? imageLabel}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-auto w-full object-contain"
          />
        </li>
      ))}
    </ul>
  );
}
