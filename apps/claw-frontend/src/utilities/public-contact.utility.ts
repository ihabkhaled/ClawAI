/**
 * A `tel:` href for a display phone number: spaces, dots, dashes and brackets
 * are dropped so dialers accept it, while the leading `+` is kept.
 */
export function buildTelHref(phone: string): string {
  return `tel:${phone.replaceAll(/[^\d+]/g, '')}`;
}
