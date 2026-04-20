import { readSecrets, writeSecrets, clearSecrets } from '../auth/auth-store.js';
import { getApiUrl } from '../config/config-store.js';

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export class ApiError extends Error {
  constructor(status, code, message, body) {
    super(`${status} ${code}: ${message}`);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export function apiUrl(path) {
  const base = getApiUrl().replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function rawFetch(path, { method = 'GET', body, headers = {}, accessToken } = {}) {
  const finalHeaders = { 'content-type': 'application/json', ...headers };
  if (accessToken !== undefined) {
    finalHeaders.authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(apiUrl(path), {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    const code = data?.code ?? data?.error ?? 'http_error';
    const message = data?.messageKey ?? data?.message ?? response.statusText;
    throw new ApiError(response.status, code, message, data);
  }
  return data;
}

async function tryRefresh() {
  const secrets = readSecrets();
  if (secrets === null || secrets.refreshToken === undefined) {
    return null;
  }
  try {
    const result = await rawFetch('/api/v1/agent/auth/refresh', {
      method: 'POST',
      body: { refreshToken: secrets.refreshToken },
    });
    writeSecrets({
      ...secrets,
      refreshToken: result.refreshToken,
      lastRefreshAt: new Date().toISOString(),
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearSecrets();
      throw new AuthError(err.code, 'Refresh failed; please run `claw-agent login` again.');
    }
    throw err;
  }
}

export async function request(path, options = {}) {
  const secrets = readSecrets();
  const accessToken = options.accessToken ?? secrets?.accessToken;
  try {
    return await rawFetch(path, { ...options, accessToken });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    const refreshed = await tryRefresh();
    if (refreshed === null) throw new AuthError('unauthorized', 'Not logged in.');
    return rawFetch(path, { ...options, accessToken: refreshed });
  }
}

export async function publicRequest(path, options = {}) {
  return rawFetch(path, options);
}
