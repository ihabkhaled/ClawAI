/**
 * A platform API request was refused before it was sent: the host is not on
 * `PLATFORM_API_FIXED_HOSTS` (or a valid Wikipedia edition), the scheme is not
 * https, or the URL failed the SSRF guard. Classified as `UNSAFE_URL`.
 */
export class PlatformHostRefusedError extends Error {
  constructor(host: string) {
    super(`Platform API host refused: ${host}`);
    this.name = 'PlatformHostRefusedError';
  }
}
