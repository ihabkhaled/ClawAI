import type { VideoGenerationRecord, VideoGenerationView } from '../types/video-generation.types';

/**
 * The public shape of a generation: the row with its clip flattened to `asset`,
 * and without the fields that are ours alone (owner id, the provider operation id,
 * the auth-service reservation id).
 */
export function toVideoView(row: VideoGenerationRecord): VideoGenerationView {
  const {
    assets,
    userId: _userId,
    providerOperationId: _operationId,
    paygReservationId: _reservationId,
    ...rest
  } = row;
  const output = assets.at(0);
  return {
    ...rest,
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
