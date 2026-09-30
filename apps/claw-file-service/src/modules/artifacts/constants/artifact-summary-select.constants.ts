/** Every column the owner sees. `content` is deliberately absent: a list never ships the bodies. */
export const ARTIFACT_SUMMARY_SELECT = {
  id: true,
  publicId: true,
  title: true,
  filename: true,
  mimeType: true,
  sizeBytes: true,
  sha256: true,
  createdAt: true,
} as const;
