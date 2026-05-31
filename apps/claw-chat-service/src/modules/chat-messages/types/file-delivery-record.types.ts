import { type FileDeliveryRecord } from '../../../generated/prisma';
import { type FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';

// Input shape used by ParallelExecutionManager (and any future caller) to
// persist a per-(message, file, model) delivery row. Mirrors the columns of
// the FileDeliveryRecord Prisma model minus the auto-generated `id`/`createdAt`.
export type FileDeliveryRecordInput = {
  messageId: string;
  threadId: string;
  userId: string;
  fileId: string;
  filename: string;
  mimeType: string;
  provider: string;
  model: string;
  mode: FileDeliveryMode;
  supportsVision: boolean;
};

// Pass-through alias so callers don't need to import the generated Prisma
// type directly — keeps the public surface stable if the underlying client
// changes.
export type FileDeliveryRecordView = FileDeliveryRecord;
