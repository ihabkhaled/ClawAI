import { type RouterModelRegistryRecord } from '../../router-models/types/router-model-registry.types';

export type RuntimeType = 'CLOUD' | 'OLLAMA' | 'LLAMACPP' | 'UNKNOWN';

export function runtimeTypeOf(profile: RouterModelRegistryRecord): RuntimeType {
  if (profile.provider === 'OLLAMA') return 'OLLAMA';
  if (profile.provider === 'LLAMACPP') return 'LLAMACPP';
  if (profile.isLocal) return 'OLLAMA';
  return 'CLOUD';
}
