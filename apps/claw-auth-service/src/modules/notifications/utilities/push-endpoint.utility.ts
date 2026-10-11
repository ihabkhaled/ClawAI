import { PUSH_ALLOWED_HOST_SUFFIXES } from '../constants/notifications.constants';

/**
 * True only for an https URL on a browser vendor's push service, with no credentials and no
 * custom port. Used when a subscription is accepted and again before every send, so a row saved
 * under an older rule can never be used to reach an internal address.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return PUSH_ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}
