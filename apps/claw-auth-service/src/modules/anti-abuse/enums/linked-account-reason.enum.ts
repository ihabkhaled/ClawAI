/** Why the admin linked-accounts view ties another account to this one. */
export enum LinkedAccountReason {
  /** Same device fingerprint hash. */
  DEVICE = 'DEVICE',
  /** Same client-stored device id hash. */
  DEVICE_ID = 'DEVICE_ID',
  /** Registered from the same IPv4 /24 or IPv6 /48. */
  REGISTRATION_IP = 'REGISTRATION_IP',
}
