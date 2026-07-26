/**
 * What kind of instrument a vaulted method is.
 *
 * Local to this service rather than in shared-types: no other service reasons
 * about instrument types, and the frontend renders the brand and last four
 * digits rather than this discriminator.
 */
export enum PaymentMethodType {
  CARD = 'CARD',
  WALLET = 'WALLET',
}
