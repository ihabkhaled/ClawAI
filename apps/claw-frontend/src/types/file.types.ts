import type { FileIngestionStatus } from "@/enums";

export type UploadedFile = {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  ingestionStatus: FileIngestionStatus;
  parentFileId?: string | null;
  isExtracted?: boolean;
  createdAt: string;
  updatedAt: string;
  retentionExpiresAt?: string | null;
};

export type FileAttachmentGroup = {
  parent: UploadedFile;
  children: UploadedFile[];
};

export type FileAttachmentGrouping = {
  groups: FileAttachmentGroup[];
  standalone: UploadedFile[];
  hasGroups: boolean;
};

export type UseFileAttachmentGroupingReturn = FileAttachmentGrouping & {
  expandedParentIds: ReadonlySet<string>;
  toggleParentExpansion: (parentId: string) => void;
  isParentExpanded: (parentId: string) => boolean;
};

export type FileChunk = {
  id: string;
  fileId: string;
  chunkIndex: number;
  content: string;
  createdAt: string;
};

export type FileWithChunks = UploadedFile & {
  chunks: FileChunk[];
};

export type UploadFileRequest = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  content?: string;
};
