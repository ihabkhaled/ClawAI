import { useQuery } from '@tanstack/react-query';

import {
  PLUGIN_IMPORT_EMPTY_LIST,
  PLUGIN_IMPORTS_QUERY_KEY,
} from '@/constants/plugin-import.constants';
import { pluginImportsRepository } from '@/repositories/plugins/plugin-imports.repository';
import type { ImportedPluginView } from '@/types/plugin-import.types';

/** The signed-in user's imported plugins. Scoped by the server to the JWT. */
export function usePluginImports(): { list: ImportedPluginView[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: PLUGIN_IMPORTS_QUERY_KEY,
    queryFn: () => pluginImportsRepository.list(),
  });
  return { list: query.data ?? PLUGIN_IMPORT_EMPTY_LIST, isLoading: query.isLoading };
}
