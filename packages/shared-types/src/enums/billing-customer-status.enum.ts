// State of the local mirror of a gateway customer record. BLOCKED stops any new
// checkout for the user (used after a chargeback or confirmed refund abuse).
export enum BillingCustomerStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  DELETED = 'DELETED',
}
