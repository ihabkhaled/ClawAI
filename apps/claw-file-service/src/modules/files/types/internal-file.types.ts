export type CreateInternalFileBody = {
  userId: string;
  filename: string;
  mimeType: string;
  // base64-encoded content body
  contentBase64: string;
  sourceWorkspaceObjectId?: string;
};
