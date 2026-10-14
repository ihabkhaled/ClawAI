/** What the user picks on the in-chat consent card. Mirrors plugin-service's ConsentChoice. */
export enum PluginConsentChoice {
  AllowOnce = 'ALLOW_ONCE',
  AllowChat = 'ALLOW_CHAT',
  AlwaysAllow = 'ALWAYS_ALLOW',
  Deny = 'DENY',
}

/** Where a consent request stands. Only PENDING can still be answered. */
export enum PluginConsentStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Denied = 'DENIED',
  Expired = 'EXPIRED',
  Consumed = 'CONSUMED',
}
