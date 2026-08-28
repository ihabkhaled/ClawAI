export const ANTHROPIC_DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
// `2023-06-01` is the only current value Anthropic accepts here. The header is a
// dated *API version*, not a feature flag: there is no `2024-06-01`, and sending
// one makes every call — /v1/models included — fail with HTTP 400 before the
// request is ever routed. Opt-in features (including the native `document`
// content part for PDF attachments) travel on `anthropic-beta`, which is a
// separate header and leaves this one alone.
export const ANTHROPIC_VERSION = '2023-06-01';
