// Multimodal batch 7 — video processing limits (ffprobe / ffmpeg).
import { VideoProcessingStep } from '../../../common/enums/video-processing-step.enum';
//
// Declaration ownership (rules/12): every limit the video pipeline enforces is
// named here, never inline in a manager, adapter or utility. Nothing here is an
// environment variable: the binaries sit on the image's PATH (Debian `ffmpeg`),
// and a limit an operator could raise from `.env` is a limit a typo can remove.

/** Resolved on PATH inside the Debian image (`apt-get install ffmpeg`). */
export const FFPROBE_BINARY = 'ffprobe';
export const FFMPEG_BINARY = 'ffmpeg';

/**
 * Passed as `-protocol_whitelist` before EVERY input. `file` is the temp copy;
 * `pipe` is there because ffmpeg opens some outputs through it. No `http`,
 * `tcp`, `udp`, `rtmp`, `concat` or `subfile`: a crafted container cannot make
 * this service fetch a URL or read a second path.
 */
export const MEDIA_PROTOCOL_WHITELIST = 'file,pipe';

/**
 * Passed as `-format_whitelist` before EVERY input: only the demuxers of the
 * video types the upload validator accepts (mp4/mov, webm/mkv, avi, mpeg-ps/ts).
 * Blocks the classic polyglot — an HLS playlist or `concat` script renamed to
 * `.mp4` that points ffmpeg at `file:///etc/passwd`. Verified against Debian
 * bookworm's ffmpeg 5.1: `[hls] Format not on whitelist`.
 */
export const MEDIA_FORMAT_WHITELIST =
  'mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,mpeg,mpegts,mpegvideo';

/** ffprobe reads headers only; a container that needs longer is hostile or broken. */
export const MEDIA_PROBE_TIMEOUT_MS = 15_000;
/** Decoding a 30-minute track to 16 kHz mono is seconds of CPU; this is the ceiling. */
export const MEDIA_AUDIO_EXTRACT_TIMEOUT_MS = 180_000;
/** One frame, input-seeked (`-ss` before `-i`). */
export const MEDIA_FRAME_TIMEOUT_MS = 20_000;
/** `volumedetect` decodes the derived 16 kHz mono track once; a 30-minute track is seconds. */
export const MEDIA_VOLUME_DETECT_TIMEOUT_MS = 60_000;
/**
 * `volumedetect` prints its result at the END of stderr, after the input and
 * output banners, so this run keeps a larger head than the 16 KB default. A
 * result pushed past it simply does not parse, and the job proceeds to
 * transcription (fail open to the pre-detection behaviour).
 */
export const MEDIA_VOLUME_DETECT_STDERR_MAX_BYTES = 64 * 1024;

/** ffprobe's JSON for a sane file is a few KB; past this the run is killed. */
export const MEDIA_STDOUT_MAX_BYTES = 1024 * 1024;
/** Only the head of stderr is kept, for the log line. */
export const MEDIA_STDERR_MAX_BYTES = 16 * 1024;
/** More streams than this is not a video a person recorded. */
export const MEDIA_PROBE_MAX_STREAMS = 32;

/** Per-job temp dir under `os.tmpdir()`; the random suffix comes from mkdtemp. */
export const MEDIA_TEMP_DIR_PREFIX = 'claw-media-';
/**
 * The ONLY input path ffmpeg ever sees: a fixed name inside the job's temp dir.
 * The user's filename never reaches an argument, so it cannot inject an option
 * or a protocol (`-i`, `concat:`, `http:`).
 */
export const MEDIA_TEMP_INPUT_NAME = 'input';
export const VIDEO_AUDIO_TEMP_NAME = 'audio.mp3';
export const VIDEO_THUMBNAIL_TEMP_NAME = 'thumbnail.jpg';
export const VIDEO_FRAME_TEMP_PREFIX = 'frame-';
export const VIDEO_FRAME_TEMP_EXTENSION = '.jpg';

/** 30 minutes. A global ceiling that applies before any plan is consulted. */
export const VIDEO_MAX_DURATION_MS = 30 * 60 * 1000;
/** 3840 × 2160 (4K UHD). Anything larger is refused before any decode. */
export const VIDEO_MAX_PIXELS = 3840 * 2160;

/** Speech needs 16 kHz mono; 32 kbps MP3 is ~7.2 MB for the 30-minute cap. */
export const VIDEO_AUDIO_SAMPLE_RATE = '16000';
export const VIDEO_AUDIO_CHANNELS = '1';
export const VIDEO_AUDIO_BITRATE = '32k';
export const VIDEO_AUDIO_CODEC = 'libmp3lame';
export const VIDEO_AUDIO_FORMAT = 'mp3';
/**
 * `-format_whitelist` for the DERIVED track only. It is our own MP3 inside the
 * job's temp dir, so the only demuxer it may open is `mp3`.
 */
export const MEDIA_DERIVED_AUDIO_FORMAT_WHITELIST = 'mp3';

/**
 * Silence threshold for the derived track, in dBFS. `volumedetect` reports the
 * PEAK (`max_volume`); a track whose loudest sample is below -50 dB carries no
 * audible speech (room tone sits around -60 dB; quiet speech peaks well above
 * -30 dB; pure digital silence reads -91 dB). Below it the video is recorded
 * `NO_SPEECH` and the paid transcription is never called. Quiet-but-not-silent
 * audio (at or above this) is still transcribed, and an empty answer there keeps
 * the `TRANSCRIPTION_FAILED` path.
 */
export const VIDEO_SILENCE_MAX_VOLUME_DB = -50;
/** The `volumedetect` result line's label, e.g. `max_volume: -91.0 dB`. */
export const VOLUME_DETECT_MAX_VOLUME_LABEL = 'max_volume:';
/** The unit after the value on that line. */
export const VOLUME_DETECT_UNIT_SUFFIX = ' dB';
/** What `volumedetect` prints for a track with no non-zero sample. */
export const VOLUME_DETECT_NEGATIVE_INFINITY = '-inf';

/** What the derived track is sent to the transcription provider as. */
export const VIDEO_AUDIO_MIME_TYPE = 'audio/mpeg';

export const VIDEO_FRAME_MIME_TYPE = 'image/jpeg';
/** ffmpeg's mjpeg quality scale, 2 (best) … 31 (worst). */
export const VIDEO_JPEG_QUALITY = '5';

/** The thumbnail persisted in `extractionMetadata.media`. */
export const VIDEO_THUMBNAIL_MAX_WIDTH = 480;
/** Taken this far into the clip (percent), past a black intro frame. */
export const VIDEO_THUMBNAIL_POSITION_PERCENT = 10;
/** A thumbnail larger than this is dropped rather than bloating the row. */
export const VIDEO_THUMBNAIL_MAX_BYTES = 96 * 1024;

/** On-demand frames (`POST /internal/files/:id/video-frames`). Never persisted. */
export const VIDEO_FRAME_MAX_WIDTH = 768;
export const VIDEO_FRAMES_MAX_TIMESTAMPS = 8;
/** One frame over this is omitted from the response. */
export const VIDEO_FRAME_MAX_BYTES = 512 * 1024;
/** Frames past this running total are omitted from the response. */
export const VIDEO_FRAMES_RESPONSE_MAX_BYTES = 3 * 1024 * 1024;
/** Short on purpose: frames are a cache, not storage (retention decision, batch 7). */
export const VIDEO_FRAME_CACHE_TTL_SECONDS = 600;
export const VIDEO_FRAME_CACHE_KEY_PREFIX = 'file:video-frame';

/**
 * One job per file at a time. A redelivered job, or a heal re-queue, that finds
 * the lock taken is a no-op — so a video is never transcribed (paid) twice
 * concurrently. The TTL outlives the slowest job (probe + extract + provider).
 */
export const VIDEO_PROCESSING_LOCK_KEY_PREFIX = 'file:video-process-lock';
export const VIDEO_PROCESSING_LOCK_TTL_SECONDS = 15 * 60;

/**
 * User cancellation (`POST /files/:id/processing/cancel`, pack section 72).
 * The route sets `claw:file:video:cancel:<fileId>` in Redis, so a job running
 * on ANY replica sees it: at every step boundary, and through a bounded poll
 * while an ffmpeg/ffprobe child or a provider call is in flight. The TTL is
 * the lock's — a flag never outlives the longest job that could read it.
 */
export const VIDEO_CANCEL_FLAG_KEY_PREFIX = 'claw:file:video:cancel';
export const VIDEO_CANCEL_FLAG_TTL_SECONDS = VIDEO_PROCESSING_LOCK_TTL_SECONDS;
export const VIDEO_CANCEL_FLAG_VALUE = '1';
/** How often a running job re-reads the flag while a child or a provider call runs. */
export const VIDEO_CANCEL_POLL_INTERVAL_MS = 1_000;
/** The poll stops on its own after the lock TTL, even if nothing stops it. */
export const VIDEO_CANCEL_MAX_POLLS = Math.ceil(
  (VIDEO_CANCEL_FLAG_TTL_SECONDS * 1_000) / VIDEO_CANCEL_POLL_INTERVAL_MS,
);
/** The job steps that run an ffmpeg/ffprobe child — a cancel during one kills it. */
export const VIDEO_MEDIA_CHILD_STEPS: ReadonlySet<VideoProcessingStep> = new Set([
  VideoProcessingStep.PROBE,
  VideoProcessingStep.THUMBNAIL,
  VideoProcessingStep.AUDIO_EXTRACT,
  VideoProcessingStep.VOLUME_DETECT,
]);
/** The readable `extractionError` of a cancelled video (reason `PROCESSING_CANCELLED`). */
export const VIDEO_PROCESSING_CANCELLED_MESSAGE = 'Processing was cancelled.';

/**
 * A video row still carrying the placeholder this long after its last write
 * is re-queued when someone polls it — a pre-batch-7 row, or a job lost to a
 * restart. Never a bulk migration (rule 42 item 10).
 */
export const VIDEO_PROCESSING_STALE_MS = 10 * 60 * 1000;

/**
 * Prefix of the placeholder `FileProcessingManager` writes for a video upload,
 * replaced by the timestamped document when the job lands. chat-service keeps
 * its own copy (`VIDEO_FILE_PLACEHOLDER_PREFIX` in `media-placeholder.constants.ts`,
 * `'[Video file:'`) for the reason `AUDIO_PLACEHOLDER_PREFIX` documents.
 */
export const VIDEO_PLACEHOLDER_PREFIX = '[Video file: ';

/** Transcript bounds persisted in `extractionMetadata.media.transcriptSegments`. */
export const VIDEO_TRANSCRIPT_MAX_SEGMENTS = 1_000;
export const VIDEO_TRANSCRIPT_SEGMENT_MAX_CHARS = 500;
/** The whole document written to `extractedText`. */
export const VIDEO_DOCUMENT_MAX_CHARS = 60_000;
export const VIDEO_DOCUMENT_TRUNCATED_NOTE =
  '[Transcript truncated: the rest of the recording is not included.]';

/**
 * Scope inside the PAYG request id: `transcription:${fileId}:video-audio:${provider}`.
 * Stable across a redelivered job, distinct from an audio upload's id.
 */
export const VIDEO_TRANSCRIPTION_REQUEST_SCOPE = 'video-audio';

/**
 * Gemini has no segment API, so it is asked for `[mm:ss]` lines and those are
 * parsed leniently. OpenAI's `verbose_json` returns real segments instead.
 */
export const VIDEO_TRANSCRIPTION_INSTRUCTION =
  'Transcribe the attached audio verbatim. Start every line with the time it begins, as [mm:ss] (or [h:mm:ss] past one hour), then the spoken words. Start a new line at each pause or change of speaker. Output only those lines, with no commentary and no summary. If the audio contains no speech, output nothing.';

export const VIDEO_NO_AUDIO_LINE = 'No audio track.';
export const VIDEO_NO_SPEECH_LINE = 'No speech detected in the audio track.';
export const VIDEO_EMPTY_TRANSCRIPT_LINE = 'The audio track contains no recognisable speech.';
export const VIDEO_ENTITLEMENTS_UNAVAILABLE_MESSAGE =
  'the plan could not be checked, so the paid transcription step was skipped';
export const VIDEO_AUDIO_EXTRACTION_FAILED_MESSAGE = 'the audio track could not be read';

/** Seeks are kept this far inside the end: a seek to the very last ms decodes nothing. */
export const VIDEO_FRAME_END_GUARD_MS = 250;
export const VIDEO_FRAMES_NOT_A_VIDEO_CODE = 'NOT_A_VIDEO';
export const VIDEO_FRAMES_NOT_A_VIDEO_MESSAGE = 'Frames can only be taken from a video file.';
export const VIDEO_FRAMES_NOT_READY_CODE = 'VIDEO_NOT_READY';
export const VIDEO_FRAMES_NOT_READY_MESSAGE =
  'Frames are not available for this video: it has not been processed, or processing did not succeed.';
export const VIDEO_FRAMES_OUT_OF_RANGE_CODE = 'TIMESTAMP_OUT_OF_RANGE';
export const VIDEO_FRAMES_OUT_OF_RANGE_MESSAGE = 'Every timestamp must lie within the video.';
