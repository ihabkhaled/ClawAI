/** Ports a user-supplied https URL may use. 443 is the default and 8443 the common alternative. */
export const EGRESS_ALLOWED_PORTS: readonly number[] = [443, 8443];
export const EGRESS_URL_MAX_LENGTH = 2048;
export const EGRESS_CONNECT_TIMEOUT_MS = 5000;
export const EGRESS_DNS_TIMEOUT_MS = 5000;
export const EGRESS_MAX_REDIRECTS_FOLLOWED = 3;
export const HTTPS_DEFAULT_PORT = 443;

/** Host names that are never public, whatever DNS says about them. */
export const EGRESS_DENIED_HOSTS: readonly string[] = [
  'localhost',
  'metadata',
  'instance-data',
  'metadata.google.internal',
  'kubernetes.default.svc',
];

export const EGRESS_DENIED_HOST_SUFFIXES: readonly string[] = [
  '.localhost',
  '.local',
  '.internal',
  '.localdomain',
  '.lan',
  '.home',
  '.corp',
  '.intranet',
  '.private',
  '.home.arpa',
  '.in-addr.arpa',
  '.ip6.arpa',
  '.onion',
  '.test',
  '.invalid',
  '.svc',
  '.cluster.local',
];

/** Request headers a caller may never set: they decide framing, routing or identity. */
export const EGRESS_DENIED_REQUEST_HEADERS: readonly string[] = [
  'host',
  'content-length',
  'transfer-encoding',
  'connection',
  'upgrade',
  'cookie',
  'te',
  'keep-alive',
  'expect',
  'trailer',
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-real-ip',
];
export const EGRESS_DENIED_REQUEST_HEADER_PREFIXES: readonly string[] = ['proxy-', 'sec-'];

export const REDIRECT_STATUS_CODES: readonly number[] = [301, 302, 303, 307, 308];

/** IPv4 ranges that are not public: [a, b, c, d, prefixBits]. */
export const NON_PUBLIC_IPV4_RANGES: ReadonlyArray<
  readonly [number, number, number, number, number]
> = [
  [0, 0, 0, 0, 8],
  [10, 0, 0, 0, 8],
  [100, 64, 0, 0, 10],
  [127, 0, 0, 0, 8],
  [169, 254, 0, 0, 16],
  [172, 16, 0, 0, 12],
  [192, 0, 0, 0, 24],
  [192, 0, 2, 0, 24],
  [192, 88, 99, 0, 24],
  [192, 168, 0, 0, 16],
  [198, 18, 0, 0, 15],
  [198, 51, 100, 0, 24],
  [203, 0, 113, 0, 24],
  [224, 0, 0, 0, 4],
  [240, 0, 0, 0, 4],
];

export const STRICT_OCTET_PATTERN = /^(0|[1-9][0-9]{0,2})$/;
export const LEGACY_IPV4_PART_PATTERN = /^(0[xX][0-9a-fA-F]{0,8}|[0-9]{1,16})$/;
export const OCTAL_PART_PATTERN = /^0[0-7]+$/;
export const MAX_LEGACY_PART_VALUE = 0xff_ff_ff_ff;
export const BYTE_RANGE = 256;
export const IPV6_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;
export const IPV6_GROUP_COUNT = 8;
export const IPV4_BITS = 32;
