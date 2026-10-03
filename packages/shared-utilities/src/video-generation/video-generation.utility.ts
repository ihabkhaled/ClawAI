import { generationRequestText } from '../generation-request/generation-request.utility';
import {
  VIDEO_ANIMATE_ATTACHED_IMAGE_PATTERNS,
  VIDEO_ASPECT_RATIO_DEFAULT,
  VIDEO_CAPABILITY_PROVIDER_BY_CONNECTOR,
  VIDEO_DURATION_SECONDS_DEFAULT,
  VIDEO_DURATION_SECONDS_MAX,
  VIDEO_DURATION_SECONDS_MIN,
  VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR,
  VIDEO_REQUEST_PATTERNS,
} from './video-generation.constants';

/** The `VIDEO_*` provider a connector model id belongs to, or undefined for a chat model. */
export function resolveVideoCapabilityProvider(
  connectorProvider: string,
  model: string,
): string | undefined {
  const connector = connectorProvider.trim().toUpperCase();
  const pattern = VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR.get(connector);
  return pattern?.test(model.trim()) === true
    ? VIDEO_CAPABILITY_PROVIDER_BY_CONNECTOR.get(connector)
    : undefined;
}

/** The `VIDEO_*` provider for a bare model id when the connector is unknown. */
export function inferVideoCapabilityProvider(model: string): string | undefined {
  for (const connector of VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR.keys()) {
    const provider = resolveVideoCapabilityProvider(connector, model);
    if (provider !== undefined) return provider;
  }
  return undefined;
}

/** Whether a connector model id is a video-output model (drives the picker badge). */
export function isVideoOutputModel(connectorProvider: string, model: string): boolean {
  return resolveVideoCapabilityProvider(connectorProvider, model) !== undefined;
}

/**
 * Whether the message asks for a video to be made (a mention of video generation is not a request). With an image attached
 * (`hasAttachedImage`) "animate this" and "bring it to life" also count: that is
 * image-to-video, the attached image being the first frame.
 */
export function classifyVideoIntent(message: string, hasAttachedImage = false): boolean {
  // Only the part that can be a request: a feature list, a supplementary note
  // or a writing task that merely mentions "create videos" never spends money.
  const request = generationRequestText(message);
  return (
    VIDEO_REQUEST_PATTERNS.some((pattern) => pattern.test(request)) ||
    (hasAttachedImage &&
      VIDEO_ANIMATE_ATTACHED_IMAGE_PATTERNS.some((pattern) => pattern.test(request)))
  );
}

/** What the words say about the clip: length and orientation, clamped to what providers accept. */
export function readVideoRequestOptions(message: string): {
  durationSeconds: number;
  aspectRatio: '16:9' | '9:16';
} {
  const seconds = /\b(\d{1,2})\s*[- ]?(?:s|sec|secs|second|seconds)\b/iu.exec(message);
  const requested = seconds === null ? VIDEO_DURATION_SECONDS_DEFAULT : Number(seconds[1]);
  const durationSeconds = Math.min(
    VIDEO_DURATION_SECONDS_MAX,
    Math.max(VIDEO_DURATION_SECONDS_MIN, requested),
  );
  const portrait =
    /\b(?:vertical|portrait|9\s*:\s*16|tiktok|reels?|shorts?|story|stories)\b/iu.test(message);
  return { durationSeconds, aspectRatio: portrait ? '9:16' : VIDEO_ASPECT_RATIO_DEFAULT };
}
