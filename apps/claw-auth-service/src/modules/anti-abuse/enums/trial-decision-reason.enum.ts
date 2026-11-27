/** Why a new account did or did not get the free trial (one trial per device, contract 2026-11-27). */
export enum TrialDecisionReason {
  GRANTED = 'GRANTED',
  /** No device object (old client or API script): untrusted. */
  MISSING_DEVICE = 'MISSING_DEVICE',
  /** Another account with the same fingerprint or device id already redeemed a trial. */
  SHARED_DEVICE = 'SHARED_DEVICE',
  /** The registration /24 (IPv6 /48) already produced the network's trial budget in 24 h. */
  SHARED_NETWORK = 'SHARED_NETWORK',
}
