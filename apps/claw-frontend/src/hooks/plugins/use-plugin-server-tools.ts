import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import type {
  PluginServerTool,
  PluginServerView,
  UsePluginServerToolsReturn,
} from '@/types/plugin-servers.types';
import { pluginServerErrorKey } from '@/utilities/plugin-servers.utility';

import { useDiscoverPluginServer } from './use-discover-plugin-server';
import { useUpdatePluginServer } from './use-update-plugin-server';

/**
 * The discovery step of one server: connect, list the tools, let the user switch each one
 * on or off, then save the choice. Tools the server flags as enabled stay as it sent them;
 * everything else starts off, and every risk is shown as WRITE until the server says otherwise.
 */
export function usePluginServerTools(
  server: PluginServerView,
  onSaved: () => void,
): UsePluginServerToolsReturn {
  const { t } = useTranslation();
  const discover = useDiscoverPluginServer();
  const update = useUpdatePluginServer();
  const [tools, setTools] = useState<PluginServerTool[]>(server.tools);
  const { mutate: runDiscover } = discover;
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (started.current === server.id) {
      return;
    }
    started.current = server.id;
    runDiscover(server.id, { onSuccess: setTools });
  }, [server.id, runDiscover]);

  const failure = discover.error ?? update.error;
  return {
    tools,
    isDiscovering: discover.isPending,
    isSaving: update.isPending,
    errorMessage: failure === null ? null : t(pluginServerErrorKey(failure)),
    toggle: (name, enabled) => {
      setTools((current) =>
        current.map((tool) => (tool.name === name ? { ...tool, enabled } : tool)),
      );
    },
    rediscover: () => {
      runDiscover(server.id, { onSuccess: setTools });
    },
    save: () => {
      update.mutate(
        {
          id: server.id,
          body: {
            tools: tools.map(({ name, enabled, riskLevel }) => ({ name, enabled, riskLevel })),
          },
        },
        { onSuccess: onSaved },
      );
    },
  };
}
