import {
  DISPLAY_FX_FALLBACK_CDN_URL,
  DISPLAY_FX_FALLBACK_MIRROR_URL,
  DISPLAY_FX_PRIMARY_BASE_URL,
  GEO_COUNTRY_LOOKUP_URL,
} from '@claw/shared-constants';

/**
 * Environment variables that name a service this process may call. Their hosts
 * become part of the allowlist for `httpRequest` (alert #58).
 */
export const INTERNAL_HOST_ENV_SUFFIXES: readonly string[] = [
  '_SERVICE_URL',
  '_BASE_URL',
  '_API_URL',
  '_ENDPOINT',
];

/**
 * Addresses that are never a service call, whatever the configuration says.
 *
 * The cloud metadata endpoints hand out instance credentials to anything that
 * can reach them, which is the prize in most SSRF reports.
 */
export const FORBIDDEN_REQUEST_HOSTS: readonly string[] = [
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.goog',
  'fd00:ec2::254',
];

/**
 * Third-party APIs this platform calls at a host that is written down in code
 * rather than in the environment.
 *
 * The environment allowlist covers everything reached through a `*_BASE_URL`
 * style variable. These do not have one: the FX rate sources, the geo lookup
 * and the two payment gateways are constants, because changing them is a code
 * decision and not a deployment setting. Without this list, making the host
 * check unconditional would refuse legitimate traffic — which is exactly why
 * the check used to be opt-in, and why alert #58 stayed open.
 *
 * Hosts are DERIVED from the same constants the callers use, so a base URL and
 * its allowlist entry cannot drift apart.
 */
const EXTERNAL_ENDPOINT_URLS: readonly string[] = [
  DISPLAY_FX_PRIMARY_BASE_URL,
  DISPLAY_FX_FALLBACK_CDN_URL,
  DISPLAY_FX_FALLBACK_MIRROR_URL,
  GEO_COUNTRY_LOOKUP_URL,
  // Payment gateways. Their base URLs live in payment-service, which this
  // package may not import (a shared package never depends on a service), so
  // the literals are repeated here and a payment-service test asserts they
  // match.
  'https://accept.paymob.com',
  'https://api-m.sandbox.paypal.com',
  'https://api-m.paypal.com',
];

export const EXTERNAL_ENDPOINT_HOSTS: ReadonlySet<string> = new Set(
  EXTERNAL_ENDPOINT_URLS.map((value) => new URL(value).host),
);
