/** Row shape the credential repository writes. */
export type DeploymentCredentialWrite = {
  repository: string;
  ref: string;
  encryptedToken: string;
  tokenLastFour: string;
  encryptionKeyVersion: number;
  updatedByUserId: string | null;
};
