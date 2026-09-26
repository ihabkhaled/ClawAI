import { VideoAudioStatus, VideoProcessingFailureReason } from '@claw/shared-types';

import { VideoProcessingOutcome } from '../../../common/enums';
import { type VideoAnalysis } from '../types/video-processing.types';

/** How a finished video job is counted (pack §67): the analysis, folded to a bounded outcome. */
export function videoProcessingOutcome(analysis: VideoAnalysis): VideoProcessingOutcome {
  if (!analysis.ok) {
    return analysis.reason === VideoProcessingFailureReason.PROCESSING_CANCELLED
      ? VideoProcessingOutcome.CANCELLED
      : VideoProcessingOutcome.FAILED;
  }
  switch (analysis.audio.status) {
    case VideoAudioStatus.TRANSCRIBED:
      return VideoProcessingOutcome.COMPLETED;
    case VideoAudioStatus.NO_SPEECH:
      return VideoProcessingOutcome.NO_SPEECH;
    case VideoAudioStatus.NO_AUDIO_TRACK:
      return VideoProcessingOutcome.NO_AUDIO;
    default:
      return VideoProcessingOutcome.TRANSCRIPTION_FAILED;
  }
}
