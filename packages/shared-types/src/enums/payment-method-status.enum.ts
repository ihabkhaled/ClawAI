// Lifecycle of a vaulted payment method. ClawAI stores only the gateway's token
// plus masked metadata — never a PAN, CVV, or any raw card data.
export enum PaymentMethodStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  // Token revoked at the gateway; local row kept for audit until purge.
  REVOKED = 'REVOKED',
  DELETED = 'DELETED',
}
