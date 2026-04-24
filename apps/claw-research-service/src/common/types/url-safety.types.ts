export type UrlSafetyOptions = {
  allowedHosts?: string[];
  /**
   * When true, private / loopback / RFC1918 hosts (localhost, 127.x.x.x,
   * 10.x.x.x, 172.16-31.x.x, 192.168.x.x, ::1) are permitted. The cloud
   * metadata endpoint (169.254.169.254) and the 0.0.0.0 sink are still
   * blocked unconditionally. Opt in for admin-supplied URLs on self-hosted
   * deployments; leave disabled for URLs that come from untrusted sources.
   */
  allowPrivateHosts?: boolean;
};
