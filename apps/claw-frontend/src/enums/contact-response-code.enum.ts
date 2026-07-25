// Machine-readable outcome of a contact submission, shared by the /api/contact
// route (server) and the contact form hook (client). Never a raw string
// literal on either side.
export enum ContactResponseCode {
  DELIVERED = 'delivered',
  ACCEPTED_NOT_CONFIGURED = 'accepted_not_configured',
  INVALID = 'invalid',
  RATE_LIMITED = 'rate_limited',
  REJECTED = 'rejected',
  ERROR = 'error',
}
