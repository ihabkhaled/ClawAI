import { CONTACT_CLIENT_IP_HEADERS, CONTACT_UNKNOWN_CLIENT } from '@/constants/contact.constants';

// Derives a stable per-client key for rate limiting from proxy headers.
// X-Forwarded-For may be a comma list ("client, proxy1, proxy2") — the first
// entry is the originating client. Falls back to a shared "unknown" bucket so
// header-less callers are still collectively limited.
export function getClientIdentifier(headers: Headers): string {
  for (const headerName of CONTACT_CLIENT_IP_HEADERS) {
    const value = headers.get(headerName);
    if (value !== null && value.trim() !== '') {
      const first = value.split(',')[0]?.trim();
      if (first !== undefined && first !== '') {
        return first;
      }
    }
  }
  return CONTACT_UNKNOWN_CLIENT;
}
