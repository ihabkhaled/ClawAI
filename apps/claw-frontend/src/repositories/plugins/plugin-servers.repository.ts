import { apiClient } from '@/services/shared/api-client';
import type {
  CreatePluginServerRequest,
  PluginServerList,
  PluginServerTool,
  PluginServerView,
  UpdatePluginServerRequest,
} from '@/types/plugin-servers.types';
import { toDiscoveredTools, toServerList, toServerView } from '@/utilities/plugin-servers.utility';

const BASE_PATH = '/plugins/servers';

function serverPath(id: string): string {
  return `${BASE_PATH}/${encodeURIComponent(id)}`;
}

function serverPart(data: unknown): unknown {
  return typeof data === 'object' && data !== null && 'server' in data ? data.server : data;
}

/** The only place the browser talks to the user's own MCP servers API. A header value is sent once and never returned. */
export const pluginServersRepository = {
  async list(): Promise<PluginServerList> {
    const response = await apiClient.get<unknown>(BASE_PATH);
    return toServerList(response.data);
  },

  /** POST answers the new server, with its first tool list when the backend discovers on create. */
  async create(body: CreatePluginServerRequest): Promise<PluginServerView | undefined> {
    const response = await apiClient.post<unknown>(BASE_PATH, body);
    const server = toServerView(serverPart(response.data));
    if (server === undefined) {
      return undefined;
    }
    const tools = toDiscoveredTools(response.data);
    return tools.length > 0 && server.tools.length === 0
      ? { ...server, tools, toolCount: tools.filter((tool) => tool.enabled).length }
      : server;
  },

  async update(id: string, body: UpdatePluginServerRequest): Promise<PluginServerView | undefined> {
    const response = await apiClient.patch<unknown>(serverPath(id), body);
    return toServerView(serverPart(response.data));
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(serverPath(id));
  },

  async discover(id: string): Promise<PluginServerTool[]> {
    const response = await apiClient.post<unknown>(`${serverPath(id)}/discover`, {});
    return toDiscoveredTools(response.data);
  },
};
