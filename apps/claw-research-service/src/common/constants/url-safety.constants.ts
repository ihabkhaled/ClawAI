/**
 * The host sets and protocols the SSRF guard works from.
 *
 * These matter more since 2026-09-11, when a URL a USER typed first became
 * reachable by the fetcher. Before that every URL the fetcher saw had come from
 * a search provider, so "syntactic check, no DNS" was a defensible depth. It is
 * not defensible against an address someone chose on purpose.
 */

/** Names that always mean "this machine" or "no host at all". */
export const PRIVATE_HOSTNAMES: ReadonlySet<string> = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  '::1',
  '[::1]',
  '::',
  '[::]',
  '0.0.0.0',
]);

/**
 * Cloud instance-metadata addresses, blocked on EVERY deployment.
 *
 * These are the highest-value SSRF targets in existence — they hand out cloud
 * credentials to anything that can make a plain GET — so they stay blocked even
 * where private hosts are deliberately permitted.
 */
export const CLOUD_METADATA_HOSTS: ReadonlySet<string> = new Set([
  // AWS / OpenStack / DigitalOcean / Azure IMDS all answer here.
  '169.254.169.254',
  // GCP, which also answers on a name.
  'metadata.google.internal',
  'metadata.goog',
  // Alibaba Cloud.
  '100.100.100.200',
  // Oracle Cloud.
  '192.0.0.192',
]);

/** Retained for callers that referenced the single AWS constant by name. */
export const AWS_METADATA_IP = '169.254.169.254';

export const ALLOWED_OUTBOUND_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/**
 * The `.internal`-style suffixes that never resolve to anything public.
 *
 * A name-based check, because an attacker who controls a hostname does not need
 * an IP literal: `http://vault.internal/` is shorter and gets past anything
 * that only looks at digits.
 */
export const PRIVATE_HOST_SUFFIXES: ReadonlyArray<string> = [
  '.localhost',
  '.local',
  '.internal',
  '.intranet',
  '.lan',
  '.home.arpa',
] as const;
