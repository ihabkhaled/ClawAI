/**
 * Why the admin "Linked accounts" view ties two accounts together
 * (GET /admin/users/:id/linked-accounts).
 */
export enum LinkedAccountReason {
  /** Same device fingerprint (hashed signals). */
  DEVICE = 'DEVICE',
  /** Same random device id kept in the browser. */
  DEVICE_ID = 'DEVICE_ID',
  /** Registered from the same network (/24 for IPv4, /48 for IPv6). */
  REGISTRATION_IP = 'REGISTRATION_IP',
}
