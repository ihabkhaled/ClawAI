export type ContentSecurityPolicyOptions = {
  // Per-request random nonce that authorises inline scripts we control.
  nonce: string;
  // Development relaxes script-src ('unsafe-eval') and connect-src (HMR ws).
  isDev: boolean;
  // Upgrade subresources only when the current request already uses HTTPS.
  // Enabling this on an HTTP localhost/self-hosted request breaks same-origin
  // navigation by sending browser prefetches to a nonexistent TLS endpoint.
  upgradeInsecureRequests: boolean;
  // When the AdSense loader may be injected, widen frame/img/connect to the
  // Google ad hosts. Kept off by default so the strictest policy ships when
  // ads are disabled.
  adsenseEnabled: boolean;
};
