import { EgressBlockReason } from '../../../common/enums/egress-block-reason.enum';
import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import {
  EGRESS_DENIED_HOST_SUFFIXES,
  EGRESS_DENIED_HOSTS,
  EGRESS_URL_MAX_LENGTH,
  HTTPS_DEFAULT_PORT,
} from '../constants/egress.constants';
import { EgressError } from '../errors/egress.error';
import { type CheckedUrl, type EgressUrlPolicy } from '../types/egress.types';

function blocked(reason: EgressBlockReason): EgressError {
  return new EgressError(EgressErrorCode.BLOCKED_URL, reason, reason);
}

/** The URL parser silently deletes tabs and newlines and trims C0 controls, so refuse them up front. */
function hasControlOrSpace(raw: string): boolean {
  for (const char of raw) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

function parseUrl(raw: string): URL {
  if (raw.length > EGRESS_URL_MAX_LENGTH) throw blocked(EgressBlockReason.TOO_LONG);
  if (hasControlOrSpace(raw)) throw blocked(EgressBlockReason.CONTROL_CHARACTERS);
  try {
    return new URL(raw);
  } catch {
    throw blocked(EgressBlockReason.UNPARSEABLE);
  }
}

function portOf(url: URL): number {
  return url.port === '' ? HTTPS_DEFAULT_PORT : Number(url.port);
}

function assertHostName(hostname: string): string {
  // "example.com." is the same host as "example.com"; one trailing dot is folded away, two are refused.
  const host = (hostname.endsWith('.') ? hostname.slice(0, -1) : hostname).toLowerCase();
  if (host.startsWith('[')) throw blocked(EgressBlockReason.IP_LITERAL);
  const labels = host.split('.');
  const tld = labels.at(-1) ?? '';
  // A TLD never starts with a digit, so a host ending in one is an IP written in some number base.
  if (/^[0-9]/.test(tld)) throw blocked(EgressBlockReason.IP_LITERAL);
  if (host === '' || labels.includes('')) throw blocked(EgressBlockReason.UNPARSEABLE);
  if (EGRESS_DENIED_HOSTS.includes(host)) throw blocked(EgressBlockReason.LOCAL_NAME);
  if (EGRESS_DENIED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw blocked(EgressBlockReason.LOCAL_NAME);
  }
  if (labels.length < 2) throw blocked(EgressBlockReason.SINGLE_LABEL);
  return host;
}

/**
 * The syntax half of the SSRF guard: https only, no userinfo, no fragment, an allow-listed port,
 * and a host that is a real public-looking DNS name (no IP literal in any notation, no local or
 * single-label name). It runs on the parsed URL, so decimal/octal/hex IPs and unicode or
 * full-width digits are already folded by the WHATWG parser before the host is judged. The
 * DNS half (every answer public, connection pinned) lives in SafeEgressManager.
 */
export function assertPublicUrl(raw: string, policy: EgressUrlPolicy): CheckedUrl {
  const url = parseUrl(raw);
  if (url.protocol !== 'https:') throw blocked(EgressBlockReason.SCHEME);
  if (url.username !== '' || url.password !== '') throw blocked(EgressBlockReason.USERINFO);
  if (url.hash !== '' || raw.includes('#')) throw blocked(EgressBlockReason.FRAGMENT);
  const port = portOf(url);
  if (!policy.allowedPorts.includes(port)) throw blocked(EgressBlockReason.PORT);
  return { url, host: assertHostName(url.hostname), port };
}
