/**
 * A model id with its decoration removed: lower-cased, trimmed, Gemini's
 * `models/` prefix and Ollama's `:cloud` suffix dropped.
 *
 * Connector catalogs, routing deployments, plan rows and the chat picker all
 * spell the same model differently (`models/gemini-2.5-flash` from the Gemini
 * catalog, `gemini-2.5-flash` everywhere else). Comparing raw strings rejected
 * the exact model a capability check had just recommended — rule 42 item 13.
 * One normalizer, shared by every service that compares model ids.
 */
export function bareModelKey(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/^models\//u, '')
    .replace(/:cloud$/u, '');
}

/**
 * One spelling per (provider, model), so catalog, deployment, snapshot and
 * plan keys compare equal: `PROVIDER/bare-model`.
 */
export function modelMatchKey(provider: string, model: string): string {
  return `${provider.trim().toUpperCase()}/${bareModelKey(model)}`;
}
