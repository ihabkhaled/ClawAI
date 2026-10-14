import { useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { PluginServerView, UsePluginServersPageReturn } from '@/types/plugin-servers.types';
import { pluginServerErrorKey, serverCap } from '@/utilities/plugin-servers.utility';

import { usePluginServers } from './use-plugin-servers';
import { useRemovePluginServer } from './use-remove-plugin-server';
import { useUpdatePluginServer } from './use-update-plugin-server';

/** My MCP servers: the list, the plan cap, the on/off switch, and the add, tools and remove dialogs. */
export function usePluginServersPage(): UsePluginServersPageReturn {
  const { t } = useTranslation();
  const list = usePluginServers();
  const update = useUpdatePluginServer();
  const remove = useRemovePluginServer();
  const [addOpen, setAddOpen] = useState(false);
  const [toolsFor, setToolsFor] = useState<PluginServerView | undefined>(undefined);
  const [removeFor, setRemoveFor] = useState<PluginServerView | undefined>(undefined);
  const failure = update.error ?? remove.error;

  return {
    t,
    servers: list.list.servers,
    cap: serverCap(list.list.servers.length, list.list.limit),
    isLoading: list.isLoading,
    isError: list.isError,
    retry: list.retry,
    errorMessage: failure === null ? null : t(pluginServerErrorKey(failure)),
    pendingId: update.isPending ? update.variables.id : null,
    setEnabled: (server, enabled) => {
      update.mutate({ id: server.id, body: { enabled } });
    },
    addOpen,
    openAdd: () => {
      setAddOpen(true);
    },
    closeAdd: () => {
      setAddOpen(false);
    },
    toolsFor,
    openTools: setToolsFor,
    closeTools: () => {
      setToolsFor(undefined);
    },
    removeFor,
    askRemove: setRemoveFor,
    cancelRemove: () => {
      setRemoveFor(undefined);
    },
    confirmRemove: () => {
      if (removeFor !== undefined) {
        remove.mutate(removeFor.id, {
          onSuccess: () => {
            setRemoveFor(undefined);
          },
        });
      }
    },
    isRemoving: remove.isPending,
  };
}
