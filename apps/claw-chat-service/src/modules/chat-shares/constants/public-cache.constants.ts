// `no-store`, not a short max-age.
//
// A revoked share must stop resolving the moment the owner revokes it. Any
// cache in front of this endpoint — CDN, proxy, browser — would keep serving a
// conversation its owner deliberately took down, and "it expires in 60 seconds"
// is not an answer to somebody who just realised what they published.
export const PUBLIC_SHARE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate';
