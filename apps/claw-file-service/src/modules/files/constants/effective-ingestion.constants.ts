import { VIDEO_PROCESSING_LOCK_TTL_SECONDS } from './video-processing.constants';

/**
 * How long an OWNER-facing file response (list, `GET /files/:id`) keeps
 * reporting a media placeholder row as `PROCESSING` after its last write.
 *
 * The frontend file list polls for as long as any row is PENDING/PROCESSING
 * (`useFiles`), so a placeholder whose job was lost — or an audio row older
 * than the transcription pipeline — would otherwise hold every open tab in a
 * permanent poll (rule 42 item 10). Two video lock TTLs outlive the slowest
 * real job by a wide margin; past that the owner view reports the persisted
 * status instead. The internal readiness check (`getIngestionState`) has no
 * ceiling: chat-service's wait is already bounded, and a stale video there is
 * re-queued on use.
 */
export const OWNER_PLACEHOLDER_PROCESSING_CEILING_MS = 2 * VIDEO_PROCESSING_LOCK_TTL_SECONDS * 1000;
