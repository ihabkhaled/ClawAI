export type SamlAttribute = {
  name: string;
  values: string[];
};

export type ParsedSamlResponse = {
  xml: string;
  issuer: string | null;
  nameId: string | null;
  x509: string | null;
  signedInfo: string | null;
  signatureValue: string | null;
  attributes: SamlAttribute[];
};

export type SamlVerificationResult =
  | {
      ok: true;
      nameId: string;
      attributes: SamlAttribute[];
    }
  | { ok: false; reason: string };

export type OrgSsoMetadata = {
  expectedIssuer: string;
  acceptedFingerprintsSha256?: string[];
};
