import { apiClient } from "@/services/shared/api-client";
import type {
  UploadedFile,
  FileWithChunks,
  UploadFileRequest,
} from "@/types";

export const filesRepository = {
  async getFiles(
    params?: Record<string, string>,
  ): Promise<UploadedFile[]> {
    const response = await apiClient.get<{ data: UploadedFile[]; meta: unknown }>("/files", params);
    return response.data.data;
  },

  async getFile(id: string): Promise<FileWithChunks> {
    const response = await apiClient.get<FileWithChunks>(`/files/${id}`);
    return response.data;
  },

  async uploadFile(data: UploadFileRequest): Promise<UploadedFile> {
    const response = await apiClient.post<UploadedFile>("/files", data);
    return response.data;
  },

  async deleteFile(id: string): Promise<void> {
    await apiClient.delete(`/files/${id}`);
  },
};
