import {
  PLUGIN_IMPORT_UPLOAD_FIELD,
  PLUGIN_IMPORT_UPLOAD_TIMEOUT_MS,
  PLUGIN_IMPORTS_PATH,
} from '@/constants/plugin-import.constants';
import { apiClient } from '@/services/shared/api-client';
import type { ImportedPluginView, PluginImportPreviewResponse } from '@/types/plugin-import.types';

function importPath(id: string): string {
  return `${PLUGIN_IMPORTS_PATH}/${encodeURIComponent(id)}`;
}

/** The only place the browser talks to the plugin import API. Nothing here runs imported code. */
export const pluginImportsRepository = {
  async list(): Promise<ImportedPluginView[]> {
    const response = await apiClient.get<ImportedPluginView[]>(PLUGIN_IMPORTS_PATH);
    return response.data;
  },

  async previewGithub(source: string, subdir?: string): Promise<PluginImportPreviewResponse> {
    const response = await apiClient.post<PluginImportPreviewResponse>(
      `${PLUGIN_IMPORTS_PATH}/preview/github`,
      subdir === undefined || subdir === '' ? { source } : { source, subdir },
    );
    return response.data;
  },

  async previewUpload(file: File, subdir?: string): Promise<PluginImportPreviewResponse> {
    const body = new FormData();
    body.append(PLUGIN_IMPORT_UPLOAD_FIELD, file, file.name);
    if (subdir !== undefined && subdir !== '') {
      body.append('subdir', subdir);
    }
    const response = await apiClient.post<PluginImportPreviewResponse>(
      `${PLUGIN_IMPORTS_PATH}/preview/upload`,
      body,
      { timeout: PLUGIN_IMPORT_UPLOAD_TIMEOUT_MS },
    );
    return response.data;
  },

  async confirm(draftId: string, checksum: string): Promise<ImportedPluginView> {
    const response = await apiClient.post<ImportedPluginView>(`${importPath(draftId)}/confirm`, {
      checksum,
      acknowledged: true,
    });
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(importPath(id));
  },
};
