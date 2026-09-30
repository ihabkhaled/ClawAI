export interface CreatePublishedArtifactData {
  publicId: string;
  userId: string;
  title: string | null;
  filename: string;
  mimeType: string;
  content: string;
  sizeBytes: number;
  sha256: string;
}

/** Owner-facing view. Never carries the content. */
export interface ArtifactSummary {
  id: string;
  publicId: string;
  url: string;
  title: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: Date;
}

/** The columns the owner list reads. */
export interface ArtifactSummaryRow {
  id: string;
  publicId: string;
  title: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: Date;
}

/** What the publish checks measured on the way through. */
export interface ArtifactMeasurement {
  sizeBytes: number;
  sha256: string;
}
