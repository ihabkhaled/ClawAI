// The public route a share resolves to. Kept in one place so the backend URL
// builder, the frontend route and the sitemap can never drift apart.
export const PUBLIC_SHARE_PATH_PREFIX = '/share/chat';

// Page size for the sitemap feed. Bounded so one request cannot ask the
// database for every public share at once.
export const SITEMAP_FEED_PAGE_SIZE = 500;
export const SITEMAP_FEED_MAX_PAGE_SIZE = 5000;
