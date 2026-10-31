/** Longest raw user-agent string kept on a session row (sessions.user_agent is VarChar 512). */
export const USER_AGENT_MAX_LENGTH = 512;
/** Longest parsed OS or browser label (sessions.os / sessions.browser are VarChar 64). */
export const UNKNOWN_LABEL_MAX_LENGTH = 64;

export const DEVICE_KIND_DESKTOP = 'DESKTOP';
export const DEVICE_KIND_MOBILE = 'MOBILE';
export const DEVICE_KIND_TABLET = 'TABLET';
export const DEVICE_KIND_TOOL = 'TOOL';
export const DEVICE_KIND_UNKNOWN = 'UNKNOWN';

/** Order matters: Edge and Opera also say "Chrome", Chrome also says "Safari". */
export const BROWSER_RULES: readonly (readonly [string, RegExp])[] = [
  ['Edge', /\bEdg(?:e|A|iOS)?\/(\d+)/],
  ['Opera', /\b(?:OPR|Opera)\/(\d+)/],
  ['Samsung Internet', /\bSamsungBrowser\/(\d+)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /\b(?:Chrome|CriOS)\/(\d+)/],
  ['Safari', /\bVersion\/(\d+)[\d.]{0,20} Safari\//],
  ['Safari', /\bVersion\/(\d+)[\d.]{0,20} Mobile\/\w{1,20} Safari\//],
  ['Safari', /\bSafari\/(\d+)/],
];

/** Non-browser clients that identify themselves. */
export const TOOL_RULES: readonly (readonly [string, RegExp])[] = [
  ['ClawAI for VS Code', /\bclawai[- ]?(?:for[- ])?vs-?code\b/i],
  ['VS Code', /\bVSCode\/(\d+)/i],
  ['curl', /^curl\/(\d+)/i],
  ['Postman', /^PostmanRuntime\/(\d+)/i],
  ['Python requests', /^python-requests\/(\d+)/i],
  ['Node.js', /^(?:node-fetch|undici|node)(?:\/(\d+)|)/i],
  ['Go HTTP', /^Go-http-client\/(\d+)/i],
  ['Axios', /^axios\/(\d+)/i],
];
