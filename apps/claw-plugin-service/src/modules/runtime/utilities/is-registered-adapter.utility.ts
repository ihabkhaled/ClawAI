import { BUILTIN_ADAPTER_KEYS } from '../constants/adapter-registry.constants';

export function isRegisteredAdapterKey(adapterKey: string): boolean {
  return BUILTIN_ADAPTER_KEYS.includes(adapterKey);
}
