// BASE_URL = '' means API_BASE_URL = '/api/v1' (relative). Browser sends
// to whichever host the page is on (claw.local, claw.example.com, an IP, etc.).
// Override with NEXT_PUBLIC_API_URL only if pointing to a remote backend.
const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export const API_BASE_URL = `${BASE_URL}/api/v1`;
