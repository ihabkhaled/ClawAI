import type {
  AudioGenerationRecord,
  AudioGenerationView,
  AudioInternalView,
} from '../types/audio-generation.types';

/**
 * The public shape of a generation. `assetUrl`, `mimeType` and `durationSec` appear
 * only once there is an asset; `errorCode` and `errorMessage` only on a failure. The
 * owner id, the auth-service reservation id and the prompt never leave the service.
 */
export function toAudioView(row: AudioGenerationRecord): AudioGenerationView {
  const output = row.assets.at(0);
  return {
    ...toAudioInternalView(row),
    threadId: row.threadId,
    messageId: row.messageId,
    supersededById: row.supersededById,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    asset:
      output === undefined
        ? null
        : {
            id: output.id,
            url: output.url,
            downloadUrl: output.downloadUrl,
            mimeType: output.mimeType,
            sizeBytes: output.sizeBytes,
          },
  };
}

/** The contract chat-service polls: `GET /internal/audio/:id`. */
export function toAudioInternalView(row: AudioGenerationRecord): AudioInternalView {
  const output = row.assets.at(0);
  return {
    id: row.id,
    status: row.status,
    ...(output === undefined
      ? {}
      : {
          assetUrl: output.downloadUrl,
          mimeType: output.mimeType,
          ...(output.durationSeconds === null ? {} : { durationSec: output.durationSeconds }),
        }),
    ...(row.errorCode === null ? {} : { errorCode: row.errorCode }),
    ...(row.errorMessage === null ? {} : { errorMessage: row.errorMessage }),
    provider: row.provider,
    model: row.model,
    kind: row.kind,
  };
}
