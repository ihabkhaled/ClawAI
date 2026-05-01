export const ISSUER_REGEX =
  /<(?:saml:|saml2:)?Issuer[^>]*>([^<]+)<\/(?:saml:|saml2:)?Issuer>/;

export const NAMEID_REGEX =
  /<(?:saml:|saml2:)?NameID[^>]*>([^<]+)<\/(?:saml:|saml2:)?NameID>/;

export const X509_CERT_REGEX =
  /<(?:ds:)?X509Certificate[^>]*>([^<]+)<\/(?:ds:)?X509Certificate>/;

export const SIGNED_INFO_REGEX = /<(?:ds:)?SignedInfo[^>]*>[\s\S]*?<\/(?:ds:)?SignedInfo>/;

export const SIGNATURE_VALUE_REGEX =
  /<(?:ds:)?SignatureValue[^>]*>([\s\S]*?)<\/(?:ds:)?SignatureValue>/;

export const ATTRIBUTE_BLOCK_REGEX =
  /<(?:saml:|saml2:)?Attribute[^>]*Name="([^"]+)"[^>]*>([\s\S]*?)<\/(?:saml:|saml2:)?Attribute>/g;

export const ATTRIBUTE_VALUE_REGEX =
  /<(?:saml:|saml2:)?AttributeValue[^>]*>([\s\S]*?)<\/(?:saml:|saml2:)?AttributeValue>/g;
