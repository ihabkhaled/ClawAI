/** Metadata endpoints by IP — blocked even when private hosts are permitted. */
export const METADATA_IPV4_ADDRESSES: ReadonlySet<string> = new Set([
  '169.254.169.254',
  '100.100.100.200',
  '192.0.0.192',
]);

/** AWS IMDS over IPv6, as eight lowercase hex groups without zero padding. */
export const METADATA_IPV6_ADDRESSES: ReadonlySet<string> = new Set(['fd00:ec2:0:0:0:0:0:254']);

export const IPV6_GROUP_COUNT = 8;

/** Content codings the pinned client advertises and decodes itself. */
export const PINNED_FETCH_ACCEPT_ENCODING = 'gzip, deflate, br';

/** Statuses that never carry a body; `Response` refuses a body for them. */
export const BODYLESS_STATUSES: ReadonlySet<number> = new Set([204, 205, 304]);
