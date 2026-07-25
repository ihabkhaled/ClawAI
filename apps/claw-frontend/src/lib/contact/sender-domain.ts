import { NON_ROUTABLE_EMAIL_TLDS } from '@/constants/contact.constants';

// A sender address whose domain can never receive or authenticate mail.
//
// This is a SILENT failure mode and the worst kind: the SMTP relay accepts the
// message (the address is syntactically fine), the app logs a success, and the
// mail is then dropped — by the relay, because an unverifiable sender cannot be
// DKIM-signed, or by the recipient, because the domain has no MX and no SPF.
// Nothing in the happy path reveals it, so it is checked explicitly.
//
// `.local` is reserved for mDNS (RFC 6762); `.test`, `.example`, `.invalid` and
// `.localhost` are reserved by RFC 2606. A bare hostname with no dot at all is
// equally unroutable.
export function isNonRoutableSenderDomain(address: string): boolean {
  const at = address.lastIndexOf('@');
  if (at === -1) {
    return true;
  }
  const domain = address
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (domain === '' || !domain.includes('.')) {
    return true;
  }
  return NON_ROUTABLE_EMAIL_TLDS.some((tld) => domain === tld || domain.endsWith(`.${tld}`));
}
