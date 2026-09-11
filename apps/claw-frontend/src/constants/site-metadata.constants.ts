export const SITE_TITLE = 'ClawAI — Every Frontier AI Model, One Subscription';
export const SITE_DESCRIPTION =
  'Reach Claude, GPT, Gemini, Kimi, GLM, Qwen, DeepSeek and Grok from a single account. Intelligent routing picks the right model for each task, metered against one allowance.';
export const SOCIAL_PREVIEW_IMAGE_PATH = '/clawai-social-preview.png';
export const SOCIAL_PREVIEW_IMAGE_ALT = 'ClawAI — local-first AI orchestration';

/**
 * Yandex Webmaster domain-ownership token, same reasoning as `INDEXNOW_KEY`.
 *
 * Committed rather than held in an env var: it is not a secret and cannot be
 * one, because Yandex Webmaster's own verification step is to fetch the page
 * and read this exact value back out of the rendered `<head>`. Hiding it in
 * `.env` would add full infra propagation (7 compose files, both install
 * scripts, the docs) to protect a string whose entire job is to be published,
 * and would risk the served value and the one registered with Yandex drifting
 * apart per environment — the one failure this kind of check exists to catch.
 *
 * What it authorises is narrow and read-only: it lets the operator's Yandex
 * Webmaster account see this domain's indexing status and submit sitemaps for
 * it. It grants no write access to the site and no access to anything else.
 */
export const YANDEX_SITE_VERIFICATION = 'eaf6351a197b5b96';
