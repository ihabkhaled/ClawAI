/** The desktop Chrome User-Agent for a Chromium build — without "HeadlessChrome". */
export function desktopChromeUserAgent(version: string): string {
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}
