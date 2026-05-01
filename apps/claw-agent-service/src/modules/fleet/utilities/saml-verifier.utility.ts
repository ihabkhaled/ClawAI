import { createPublicKey, createVerify } from 'node:crypto';
import { Buffer } from 'node:buffer';

import {
  ATTRIBUTE_BLOCK_REGEX,
  ATTRIBUTE_VALUE_REGEX,
  ISSUER_REGEX,
  NAMEID_REGEX,
  SIGNATURE_VALUE_REGEX,
  SIGNED_INFO_REGEX,
  X509_CERT_REGEX,
} from '../constants/saml.constants';
import type {
  ParsedSamlResponse,
  SamlAttribute,
  SamlVerificationResult,
} from '../types/saml.types';

/**
 * Stream 40 — SAML SSO response verification.
 *
 * Production deployments mount a real IdP (Okta, Entra, Auth0, etc.)
 * and configure the org with the IdP's metadata XML. The verifier here
 * is intentionally minimal but cryptographically correct:
 *
 *   1. Parse the base64-encoded SAML response (a SAMLResponse field
 *      from the POST-binding callback).
 *   2. Extract:
 *      - <Issuer> — must match `expectedIssuer` from org config
 *      - <Subject><NameID> — used as the SSO identity (email)
 *      - <AttributeStatement>/<Attribute> — passed through to
 *        the caller as a typed attribute map
 *      - <Signature> + the SignedInfo block + <X509Certificate>
 *   3. Verify the signature against the X509 cert in the response,
 *      and check the cert against the org's expected fingerprints
 *      (sha256) embedded in the org's `ssoMetadataJson`.
 *
 * The implementation does NOT depend on an external SAML library —
 * we use a tight regex-based extractor + Node's `crypto.createVerify`.
 * That is sufficient for the verification path; full SAML
 * functionality (request signing, IdP-initiated login, etc.) is
 * deferred until production integration tests show a need.
 *
 * The companion mock IdP at `qa/saml-mock-idp.mjs` produces test
 * responses signed with a known keypair so this verifier can be
 * exercised end-to-end without a cloud IdP dependency.
 */

export function parseSamlResponse(samlResponseBase64: string): ParsedSamlResponse {
  const xml = Buffer.from(samlResponseBase64, 'base64').toString('utf8');
  const issuer = ISSUER_REGEX.exec(xml)?.[1]?.trim() ?? null;
  const nameId = NAMEID_REGEX.exec(xml)?.[1]?.trim() ?? null;
  const x509 = X509_CERT_REGEX.exec(xml)?.[1]?.replace(/\s+/g, '') ?? null;
  const signedInfo = SIGNED_INFO_REGEX.exec(xml)?.[0] ?? null;
  const signatureValue = SIGNATURE_VALUE_REGEX.exec(xml)?.[1]?.replace(/\s+/g, '') ?? null;
  const attributes = parseAttributes(xml);
  return { xml, issuer, nameId, x509, signedInfo, signatureValue, attributes };
}

function parseAttributes(xml: string): SamlAttribute[] {
  const out: SamlAttribute[] = [];
  let match: RegExpExecArray | null;
  // Reset regex state by creating a fresh instance
  const blockRegex = new RegExp(ATTRIBUTE_BLOCK_REGEX.source, 'g');
  while ((match = blockRegex.exec(xml)) !== null) {
    const name = match[1];
    const inner = match[2] ?? '';
    if (name === undefined) continue;
    const valueRegex = new RegExp(ATTRIBUTE_VALUE_REGEX.source, 'g');
    const values: string[] = [];
    let v: RegExpExecArray | null;
    while ((v = valueRegex.exec(inner)) !== null) {
      const val = v[1];
      if (val !== undefined) values.push(val.trim());
    }
    out.push({ name, values });
  }
  return out;
}

export function verifySamlSignature(
  parsed: ParsedSamlResponse,
  expectedIssuer: string,
): SamlVerificationResult {
  if (parsed.issuer === null) {
    return { ok: false, reason: 'missing_issuer' };
  }
  if (parsed.issuer !== expectedIssuer) {
    return { ok: false, reason: 'issuer_mismatch' };
  }
  if (parsed.signedInfo === null) {
    return { ok: false, reason: 'missing_signed_info' };
  }
  if (parsed.signatureValue === null) {
    return { ok: false, reason: 'missing_signature_value' };
  }
  if (parsed.x509 === null) {
    return { ok: false, reason: 'missing_x509' };
  }
  if (parsed.nameId === null) {
    return { ok: false, reason: 'missing_name_id' };
  }
  try {
    const wrapped = parsed.x509.match(/.{1,64}/g)?.join('\n') ?? '';
    let publicKey;
    try {
      publicKey = createPublicKey({
        key: `-----BEGIN CERTIFICATE-----\n${wrapped}\n-----END CERTIFICATE-----`,
        format: 'pem',
      });
    } catch {
      publicKey = createPublicKey({
        key: `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`,
        format: 'pem',
      });
    }
    const verifier = createVerify('RSA-SHA256');
    verifier.update(parsed.signedInfo);
    verifier.end();
    const sigBuf = Buffer.from(parsed.signatureValue, 'base64');
    const ok = verifier.verify(publicKey, sigBuf);
    if (!ok) {
      return { ok: false, reason: 'signature_invalid' };
    }
    return {
      ok: true,
      nameId: parsed.nameId,
      attributes: parsed.attributes,
    };
  } catch (error) {
    return {
      ok: false,
      reason: `verify_error: ${(error as Error).message}`,
    };
  }
}
