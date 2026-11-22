/**
 * The JSON object inside a model reply (tolerates a ```json fence or prose around it);
 * null when there is none. The caller validates the shape with Zod.
 */
export function extractJsonObject(content: string): unknown {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}
