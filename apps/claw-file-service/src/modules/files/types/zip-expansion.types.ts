export type ZipExtractionThresholds = {
  maxExtractedSizeMb: number;
  maxEntryCount: number;
  maxNestingDepth: number;
  compressionRatioThreshold: number;
};

export type ExtractedEntry = {
  path: string;
  sizeBytes: number;
  mimeType: string;
};

export type ZipExtractionResult = {
  entries: ExtractedEntry[];
  totalExtractedBytes: number;
};
