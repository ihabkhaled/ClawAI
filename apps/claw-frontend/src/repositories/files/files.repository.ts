import { apiClient } from '@/services/shared/api-client';
import type {
  UploadedFile,
  FileWithChunks,
  UploadFileRequest,
  ChunkedUploadStatus,
  InitChunkedUploadRequest,
} from '@/types';
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

  /**
   * The password a user typed in chat for an ARCHIVE_ENCRYPTED archive.
   * Answers with the fresh listing (still Encrypted on a wrong password;
   * COMPLETED on the right one), or an ApiClientError with `code:
   * ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED` once the server's retry cap is spent.
   */
  async submitArchivePassword(id: string, password: string): Promise<ArchiveEntryListing> {
    const response = await apiClient.post<ArchiveEntryListing>(`/files/${id}/archive-password`, {
      password,
    });
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

  // Chunked upload — used by useChunkedUpload for files above
  // CHUNKED_UPLOAD_THRESHOLD_BYTES (recordings, mainly). See
  // ChunkedUploadManager on file-service for the session semantics.
  async initChunkedUpload(data: InitChunkedUploadRequest): Promise<ChunkedUploadStatus> {
    const response = await apiClient.post<ChunkedUploadStatus>('/files/upload/chunked/init', data);
    return response.data;
  },

  async uploadChunk(
    uploadId: string,
    index: number,
    content: string,
  ): Promise<ChunkedUploadStatus> {
    const response = await apiClient.post<ChunkedUploadStatus>(
      `/files/upload/chunked/${uploadId}/chunks/${String(index)}`,
      { content },
    );
    return response.data;
  },

  async getChunkedUploadStatus(uploadId: string): Promise<ChunkedUploadStatus> {
    const response = await apiClient.get<ChunkedUploadStatus>(
      `/files/upload/chunked/${uploadId}/status`,
    );
    return response.data;
  },

  async completeChunkedUpload(uploadId: string): Promise<UploadedFile> {
    const response = await apiClient.post<UploadedFile>(
      `/files/upload/chunked/${uploadId}/complete`,
    );
    return response.data;
  },
};
