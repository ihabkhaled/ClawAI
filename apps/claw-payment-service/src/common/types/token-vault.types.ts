/**
 * The identity a ciphertext is cryptographically bound to.
 *
 * Every field is authenticated as AAD, so a token encrypted for one row cannot be
 * decrypted in the context of another — moving a ciphertext between users fails
 * closed instead of authorising a charge against the wrong person.
 */
export type TokenVaultContext = {
  userId: string;
  gateway: string;
  paymentMethodId: string;
};
