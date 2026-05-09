import type { UseMarketplacePageReturn } from '../../types/marketplace.types';

import {
  useInstallMarketplaceListing,
  useMarketplaceListings,
} from './use-marketplace';

export function useMarketplacePage(): UseMarketplacePageReturn {
  const { data, isLoading, isError, error } = useMarketplaceListings({ page: 1, pageSize: 50 });
  const installMutation = useInstallMarketplaceListing();

  function handleInstall(id: string): void {
    installMutation.mutate(id);
  }

  return {
    listings: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
    handleInstall,
    isInstalling: installMutation.isPending,
  };
}
