import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { isIpLiteral, isPublicIpAddress } from '../../../common/utilities/network-address.utility';
import { HLS_ALLOWED_PORTS } from '../constants/sources.constants';

/** The URL with a lower-cased host and no fragment: the stable identity of a source. */
export function normalizeSourceUrl(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = '';
  copy.hostname = copy.hostname.toLowerCase();
  return copy.href;
}

/**
 * Static SSRF checks on an HLS URL (no DNS): scheme, userinfo, port and IP-literal
 * private ranges. Returns the refusal code, or null when the shape is acceptable.
 */
export function sourceUrlShapeError(url: URL, allowHttp: boolean): LiveSourceErrorCode | null {
  const schemeOk = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
  if (!schemeOk) return LiveSourceErrorCode.SOURCE_UNSAFE;
  if (url.username !== '' || url.password !== '') return LiveSourceErrorCode.SOURCE_UNSAFE;
  if (!HLS_ALLOWED_PORTS.has(url.port)) return LiveSourceErrorCode.SOURCE_UNSAFE;
  if (url.hostname === '') return LiveSourceErrorCode.SOURCE_UNSAFE;
  return isIpLiteral(url.hostname) && !isPublicIpAddress(url.hostname)
    ? LiveSourceErrorCode.SOURCE_UNSAFE
    : null;
}
