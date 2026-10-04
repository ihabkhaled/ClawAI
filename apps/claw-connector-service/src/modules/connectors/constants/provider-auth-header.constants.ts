import { type ProviderAuthHeader } from '../types/provider-auth-header.types';

/** Standard `Authorization: Bearer <key>`. */
export const DEFAULT_PROVIDER_AUTH_HEADER: ProviderAuthHeader = {
  name: 'Authorization',
  scheme: 'Bearer',
};
