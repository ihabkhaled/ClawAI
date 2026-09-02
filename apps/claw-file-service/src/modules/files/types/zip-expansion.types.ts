import type { File, FileIngestionStatus } from '../../../generated/prisma';

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

// The slice of FileProcessingManager that ZipExpansionManager depends on.
//
// The two managers call each other, which Nest resolves with forwardRef. Under
// ESM that mutual import is only safe while neither module ACCESSES the other's
// binding during evaluation — a forwardRef closure does not, but the
// `design:paramtypes` metadata emitted for a class-typed constructor parameter
// does, and it threw
// `ReferenceError: Cannot access 'FileProcessingManager' before initialization`
// at boot (prod, 2026-09-02). Typing the parameter with this interface makes the
// emitted metadata `Object` instead of the class, so nothing is read from the
// half-initialised module. Do not widen it back to the class type.
export type FileProcessingContract = {
  processFile(file: File): Promise<void>;
  updateIngestionStatus(fileId: string, status: FileIngestionStatus): Promise<void>;
};
