import { type Mock, vi } from 'vitest';

import { ImageAssetRole, ImageGenerationStatus } from '../../../../generated/prisma';
import type {
  CreateImageGenerationData,
  ImageGenerationAssetRecord,
  ImageGenerationRecord,
  ImageReferenceAssetInput,
} from '../../types/image-generation.types';

export const baseRecord = (
  overrides: Partial<ImageGenerationRecord> = {},
): ImageGenerationRecord => ({
  id: 'img-1',
  userId: 'user-1',
  threadId: null,
  userMessageId: null,
  assistantMessageId: null,
  prompt: 'a cute cat',
  revisedPrompt: null,
  provider: 'IMAGE_GEMINI',
  model: 'gemini-2.5-flash-image',
  width: 1024,
  height: 1024,
  quality: null,
  style: null,
  status: ImageGenerationStatus.QUEUED,
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  latencyMs: null,
  supersededById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assets: [],
  ...overrides,
});

export type InMemoryImageRepo = {
  rows: Map<string, ImageGenerationRecord>;
  references: Map<string, ImageGenerationAssetRecord>;
  create: Mock;
  createSuccessor: Mock;
  findById: Mock;
  updateStatus: Mock;
  createEvent: Mock;
  createAsset: Mock;
  createReferenceAsset: Mock;
  findReferenceAsset: Mock;
  findByUserId: Mock;
  countByUserId: Mock;
};

const referenceAsset = (
  generationId: string,
  fileId: string,
  mimeType: string,
): ImageGenerationAssetRecord => ({
  id: `ref-${generationId}`,
  generationId,
  storageKey: fileId,
  url: `/api/v1/files/download/${fileId}`,
  downloadUrl: `/api/v1/files/download/${fileId}`,
  mimeType,
  width: null,
  height: null,
  sizeBytes: null,
  role: ImageAssetRole.REFERENCE,
  createdAt: new Date(),
});

/**
 * A repository stand-in that behaves like the real one for what these tests
 * read back: status after `updateStatus`, the `supersededById` link and the
 * reference asset `createSuccessor` carries across (one transaction in the
 * real repository).
 */
export const buildInMemoryImageRepo = (
  seed: ImageGenerationRecord = baseRecord(),
): InMemoryImageRepo => {
  const rows = new Map<string, ImageGenerationRecord>();
  const references = new Map<string, ImageGenerationAssetRecord>();
  rows.set(seed.id, seed);
  let nextId = 2;
  const insert = (data: CreateImageGenerationData): ImageGenerationRecord => {
    const id = `img-${String(nextId)}`;
    nextId += 1;
    const row = baseRecord({
      id,
      userId: data.userId,
      threadId: data.threadId ?? null,
      userMessageId: data.userMessageId ?? null,
      provider: data.provider,
      model: data.model,
      prompt: data.prompt,
    });
    rows.set(id, row);
    return row;
  };

  return {
    rows,
    references,
    create: vi.fn((data: CreateImageGenerationData) => Promise.resolve(insert(data))),
    createSuccessor: vi.fn((predecessorId: string, data: CreateImageGenerationData) => {
      const successor = insert(data);
      const predecessor = rows.get(predecessorId);
      if (predecessor) {
        rows.set(predecessorId, { ...predecessor, supersededById: successor.id });
      }
      const reference = references.get(predecessorId);
      if (reference) {
        references.set(
          successor.id,
          referenceAsset(successor.id, reference.storageKey, reference.mimeType),
        );
      }
      return Promise.resolve(successor);
    }),
    findById: vi.fn((id: string) => Promise.resolve(rows.get(id) ?? null)),
    updateStatus: vi.fn(
      (
        id: string,
        status: ImageGenerationRecord['status'],
        extra?: { errorCode?: string; errorMessage?: string },
      ) => {
        const current = rows.get(id) ?? baseRecord({ id });
        const updated = baseRecord({
          ...current,
          status,
          errorCode: extra?.errorCode ?? current.errorCode,
          errorMessage: extra?.errorMessage ?? current.errorMessage,
        });
        rows.set(id, updated);
        return Promise.resolve(updated);
      },
    ),
    createEvent: vi.fn().mockResolvedValue(undefined),
    createAsset: vi.fn().mockResolvedValue({
      id: 'asset-1',
      url: '/api/v1/files/download/file-1',
      downloadUrl: '/api/v1/files/download/file-1',
      mimeType: 'image/png',
      width: null,
      height: null,
      sizeBytes: null,
    }),
    createReferenceAsset: vi.fn((input: ImageReferenceAssetInput) => {
      const asset = referenceAsset(input.generationId, input.fileId, input.mimeType);
      references.set(input.generationId, asset);
      return Promise.resolve(asset);
    }),
    findReferenceAsset: vi.fn((generationId: string) =>
      Promise.resolve(references.get(generationId) ?? null),
    ),
    findByUserId: vi.fn().mockResolvedValue([]),
    countByUserId: vi.fn().mockResolvedValue(0),
  };
};

/**
 * Drains the fire-and-forget job started by `void this.processJobWithFallback`.
 *
 * `setImmediate` rather than `Promise.resolve` because each attempt in the
 * chain awaits ~10 times and a microtask-only flush would return while the
 * second attempt was still in flight.
 */
export const flushImageJobs = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
};
