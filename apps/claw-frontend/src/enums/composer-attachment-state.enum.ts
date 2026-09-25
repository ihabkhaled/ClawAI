/**
 * Where one composer attachment is in its life:
 * uploading → uploaded → processing → ready, or failed / unsupported.
 *
 * `Uploaded` means the bytes landed and the id is selected, but the file list
 * has not reported its ingestion status yet (or the file is not on the first
 * page of it). `Processing` is ingestion PENDING / PROCESSING — audio
 * transcription or video processing still running server-side. Sending while
 * processing stays allowed: chat-service waits (bounded) or says so.
 * `Cancelled` is a video whose processing the owner stopped (file-service
 * FAILED with `PROCESSING_CANCELLED`): the file is still attached and stored,
 * and the model is told it was not processed.
 */
export enum ComposerAttachmentState {
  Uploading = 'UPLOADING',
  Uploaded = 'UPLOADED',
  Processing = 'PROCESSING',
  Ready = 'READY',
  Failed = 'FAILED',
  Unsupported = 'UNSUPPORTED',
  Cancelled = 'CANCELLED',
}
