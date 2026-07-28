export const VSCODE_AUTHORIZATION_REQUEST_PREFIX = 'auth:vscode:request:';
export const VSCODE_AUTHORIZATION_CODE_PREFIX = 'auth:vscode:code:';
export const VSCODE_AUTHORIZATION_REQUEST_TTL_SECONDS = 600;
export const VSCODE_AUTHORIZATION_CODE_TTL_SECONDS = 120;
export const VSCODE_AUTHORIZATION_PATH = '/authorize/vscode';
export const VSCODE_AUTHORIZATION_CLIENT_KIND = 'VSCODE' as const;
export const VSCODE_CALLBACK_SCHEMES = new Set(['vscode:', 'vscode-insiders:']);
export const VSCODE_CALLBACK_AUTHORITY = 'clawai.clawai-coding-agent';
