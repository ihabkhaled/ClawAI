/**
 * The one client-address header nginx OVERWRITES on every request
 * (`proxy_set_header X-Real-IP $remote_addr`). X-Forwarded-For is never read:
 * nginx APPENDS to it, so its left-most entry is whatever the client typed.
 */
export const THROTTLE_REAL_IP_HEADER = 'x-real-ip';

/** `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>` — internal calls. */
export const THROTTLE_SERVICE_AUTH_SCHEME = 'Service ';
export const THROTTLE_BEARER_AUTH_SCHEME = 'Bearer ';

/** Longest Authorization value worth hashing or verifying. */
export const THROTTLE_MAX_AUTHORIZATION_LENGTH = 16_384;

/**
 * Tracker prefixes keep the three key spaces apart, so a user id can never
 * collide with an address and a docker-network caller never shares a bucket
 * with a visitor.
 */
export const THROTTLE_TRACKER_USER_PREFIX = 'user:';
export const THROTTLE_TRACKER_CLIENT_PREFIX = 'ip:';
export const THROTTLE_TRACKER_PEER_PREFIX = 'peer:';
export const THROTTLE_TRACKER_UNKNOWN = 'peer:unknown';

/** Node reports IPv4 peers on a dual-stack socket as `::ffff:a.b.c.d`. */
export const IPV4_MAPPED_IPV6_PREFIX = '::ffff:';

/**
 * The docker DNS name of the one reverse proxy allowed to write X-Real-IP.
 * A service trusts the header only when the socket peer IS this container,
 * loopback, or an address in the bootstrap-only TRUSTED_PROXY_ADDRESSES env
 * (set only for a distributed nginx). "The peer is on a private network" is
 * not enough: a LAN client on a published service port, or any other
 * container on claw-network, is also private (rules/58 item 3).
 */
export const TRUSTED_PROXY_HOSTNAME = 'nginx';

/** How long a resolved proxy address is reused. */
export const TRUSTED_PROXY_CACHE_TTL_MS = 60_000;

/**
 * An unknown peer re-resolves the proxy name at most this often, so a nginx
 * recreate (new docker IP) is picked up within seconds without turning every
 * direct caller into a DNS query.
 */
export const TRUSTED_PROXY_MIN_REFRESH_MS = 5000;
