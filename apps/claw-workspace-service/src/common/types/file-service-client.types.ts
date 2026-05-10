export type UploadInternalInput = {
  userId: string;
  filename: string;
  mimeType: string;
  content: Buffer;
  sourceWorkspaceObjectId?: string;
};

export type FileServiceMetadata = {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};
