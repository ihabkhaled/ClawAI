// Payment gateways ClawAI can transact through. One adapter per value lives in
// claw-payment-service; no other file in the repo may call a gateway directly.
export enum BillingGateway {
  PAYPAL = 'PAYPAL',
  PAYMOB = 'PAYMOB',
}
