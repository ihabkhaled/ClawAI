import {
  OMNI_OPERATION_PREFIX,
  VIDEO_OMNI_RESULT_TTL_MS,
} from '../constants/video-generation.constants';

/**
 * Finished Gemini Omni clips, held in memory between the synchronous start call and the
 * poll and download that follow it. A restart loses them; the job then ends with
 * NO_VIDEO_RETURNED and the hold is released.
 */
export class OmniClipStore {
  private static readonly clips = new Map<string, { bytes: Buffer; storedAt: number }>();

  static put(bytes: Buffer): string {
    OmniClipStore.dropExpired();
    const operationId = `${OMNI_OPERATION_PREFIX}${crypto.randomUUID()}`;
    OmniClipStore.clips.set(operationId, { bytes, storedAt: Date.now() });
    return operationId;
  }

  static has(operationId: string): boolean {
    return OmniClipStore.clips.has(operationId);
  }

  /** Hands the clip over once; it is gone afterwards. */
  static take(operationId: string): Buffer | undefined {
    const clip = OmniClipStore.clips.get(operationId);
    OmniClipStore.clips.delete(operationId);
    return clip?.bytes;
  }

  private static dropExpired(): void {
    const oldest = Date.now() - VIDEO_OMNI_RESULT_TTL_MS;
    for (const [id, clip] of OmniClipStore.clips) {
      if (clip.storedAt < oldest) OmniClipStore.clips.delete(id);
    }
  }
}
