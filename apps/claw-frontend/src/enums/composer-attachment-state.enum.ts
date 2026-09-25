/**
 * Where one composer attachment is in its life:
 * uploading → uploaded → processing → ready, or failed / unsupported.
 *
 * `Uploaded` means the bytes landed and the id is selected, but the file list
 * has not reported its ingestion status yet (or the file is not on the first
 * page of it). `Processing` is ingestion PENDING / PROCESSING — audio
 * transcription or video processing still running server-side. Sending while
 * processing stays allowed: chat-service waits (bounded) or says so.
 */
export enum ComposerAttachmentState {
  Uploading = 'UPLOADING',
  Uploaded = 'UPLOADED',
  Processing = 'PROCESSING',
  Ready = 'READY',
  Failed = 'FAILED',
  Unsupported = 'UNSUPPORTED',
}
