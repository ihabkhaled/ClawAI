export async function buildOAuthErrorMessage(
  provider: string,
  operation: 'token exchange' | 'token refresh',
  response: Response,
): Promise<string> {
  const status = response.status;
  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch {
    bodyText = '';
  }
  const parsed = tryParseOAuthError(bodyText);
  const detail = parsed ?? truncate(bodyText, 300);
  const suffix = detail.length > 0 ? ` — ${detail}` : '';
  return `${provider} ${operation} failed: HTTP ${String(status)}${suffix}`;
}

function tryParseOAuthError(body: string): string | null {
  if (body.length === 0) {
    return null;
  }
  try {
    const data = JSON.parse(body) as {
      error?: string;
      error_description?: string;
      message?: string;
    };
    const parts = [data.error, data.error_description ?? data.message].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    if (parts.length > 0) {
      return parts.join(': ');
    }
  } catch {
    // not JSON — fall through
  }
  return null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…`;
}
