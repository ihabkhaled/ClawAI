/**
 * The model id the routing seed prices video by: the bare id, without Gemini's
 * `models/` catalog prefix (routing strips the same prefix when it discovers
 * models, so both spellings must meter identically).
 */
export function videoPriceKey(model: string): string {
  return model.trim().replace(/^models\//u, '');
}
