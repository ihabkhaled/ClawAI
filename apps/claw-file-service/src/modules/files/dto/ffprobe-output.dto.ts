import { z } from 'zod';
import { MEDIA_PROBE_MAX_STREAMS } from '../constants/video-processing.constants';

/**
 * The slice of `ffprobe -print_format json -show_format -show_streams` the
 * video pipeline reads. ffprobe's output is data from a hostile container, so
 * it is parsed, never trusted: anything that does not match is a corrupt file.
 * Unknown keys are stripped; numbers ffprobe prints as strings stay strings
 * here and are converted (and range-checked) by `video-probe.utility.ts`.
 */
export const ffprobeStreamSchema = z.object({
  codec_type: z.string().max(32).optional(),
  codec_name: z.string().max(64).optional(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  avg_frame_rate: z.string().max(32).optional(),
  r_frame_rate: z.string().max(32).optional(),
  duration: z.string().max(32).optional(),
});

export const ffprobeOutputSchema = z.object({
  streams: z.array(ffprobeStreamSchema).max(MEDIA_PROBE_MAX_STREAMS),
  format: z
    .object({
      format_name: z.string().max(128).optional(),
      duration: z.string().max(32).optional(),
    })
    .optional(),
});

export type FfprobeStream = z.infer<typeof ffprobeStreamSchema>;
export type FfprobeOutput = z.infer<typeof ffprobeOutputSchema>;
