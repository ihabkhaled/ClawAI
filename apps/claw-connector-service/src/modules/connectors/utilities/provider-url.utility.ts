export function isAllowedCloudProviderUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' || url.username.length > 0 || url.password.length > 0) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal' ||
    hostname === '169.254.169.254' ||
    isPrivateIpv4(hostname) ||
    hostname === '[::1]' ||
    hostname.startsWith('[fc') ||
    hostname.startsWith('[fd') ||
    hostname.startsWith('[fe80:')
  ) {
    return false;
  }

  return true;
}

export function isSafeEndpointPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

function isPrivateIpv4(hostname: string): boolean {
  const segments = hostname.split('.').map(Number);
  if (segments.length !== 4 || segments.some((segment) => !Number.isInteger(segment))) {
    return false;
  }

  const [first, second] = segments;
  return first === undefined || second === undefined
    ? false
    : first === 0 ||
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168);
}
