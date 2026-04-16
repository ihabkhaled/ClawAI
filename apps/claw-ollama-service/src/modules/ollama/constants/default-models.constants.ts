export const DEFAULT_ROUTER_MODEL = 'qwen3:1.7b';

export const DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS = new Set([
  'phi4-mini',
  'gemma3:4b',
  'gemma2:2b',
  'tinyllama',
  'phi3:mini',
  'llama3.2:3b',
]);

export function isDeprecatedDefaultLocalModel(name: string, tag?: string | null): boolean {
  const taggedKey = tag ? `${name}:${tag}` : name;

  return (
    DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS.has(name) ||
    DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS.has(taggedKey)
  );
}
