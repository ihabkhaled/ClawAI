import { apiClient } from '@/services/shared/api-client';
import type { UploadedFile, FileWithChunks, UploadFileRequest } from '@/types';
import type { ArchiveEntryListing, PaginatedFiles } from '@/types/archive.types';

export const filesRepository = {
  /** One page of top-level files (or of one archive's files, with `parentId`) and its meta. */
  async getFilesPage(params?: Record<string, string>): Promise<PaginatedFiles> {
    const response = await apiClient.get<PaginatedFiles>('/files', params);
    return response.data;
  },

  /** Every entry of an uploaded archive, extracted or skipped, with its status. */
  async getArchiveEntries(id: string): Promise<ArchiveEntryListing> {
    const response = await apiClient.get<ArchiveEntryListing>(`/files/${id}/archive-entries`);
    return response.data;
  },

  async getFile(id: string): Promise<FileWithChunks> {
    const response = await apiClient.get<FileWithChunks>(`/files/${id}`);
    return response.data;
  },

  async uploadFile(data: UploadFileRequest): Promise<UploadedFile> {
    const response = await apiClient.post<UploadedFile>('/files/upload', data);
    return response.data;
  },

  async deleteFile(id: string): Promise<void> {
    await apiClient.delete(`/files/${id}`);
  },
};
