import {
  LIVE_CAPTURE_CHUNK_SECONDS,
  LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS,
  LIVE_CAPTURE_PROCESSOR_NAME,
  LIVE_CAPTURE_SAMPLE_RATE,
  LIVE_CAPTURE_WORKLET_URL,
} from '@/constants/live.constants';
import { LiveCaptureError } from '@/enums/live.enum';
import type { LiveTabCaptureHandle, LiveTabCaptureOptions } from '@/types/live.types';

import { createLiveAudioChunker } from './live-audio.utility';
import { isLiveCaptureSupported } from './live-capture-state.utility';

/**
 * Tab-audio capture pipeline. Loaded with a dynamic `import()` by the capture hook only when the
 * viewer confirms, so none of it is in the live page bundle (rules/47).
 *
 * getDisplayMedia (this tab) → stop the video track at once → audio track → AudioContext →
 * AudioWorklet (same-origin module, mono frames) → 16 kHz PCM16 WAV chunks of 6 s → `onChunk`.
 * The worklet output feeds a muted gain so the graph keeps pulling; the tab's own sound is untouched.
 */
export async function startLiveTabCapture(
  options: LiveTabCaptureOptions,
): Promise<LiveTabCaptureHandle> {
  if (!isLiveCaptureSupported()) {
    throw new Error(LiveCaptureError.UNSUPPORTED);
  }
  const stream = await navigator.mediaDevices.getDisplayMedia(LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS);
  for (const track of stream.getVideoTracks()) {
    track.stop();
  }
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    throw new Error(LiveCaptureError.NO_AUDIO);
  }
  const context = new AudioContext();
  const stopTracks = (): void => {
    for (const track of audioTracks) {
      track.stop();
    }
  };
  try {
    await context.audioWorklet.addModule(LIVE_CAPTURE_WORKLET_URL);
  } catch (error) {
    stopTracks();
    await context.close().catch(() => undefined);
    throw error;
  }
  const source = context.createMediaStreamSource(new MediaStream(audioTracks));
  const node = new AudioWorkletNode(context, LIVE_CAPTURE_PROCESSOR_NAME);
  const mute = context.createGain();
  mute.gain.value = 0;
  source.connect(node);
  node.connect(mute);
  mute.connect(context.destination);
  const chunker = createLiveAudioChunker({
    inputRate: context.sampleRate,
    outputRate: LIVE_CAPTURE_SAMPLE_RATE,
    chunkSeconds: LIVE_CAPTURE_CHUNK_SECONDS,
    now: Date.now,
    onChunk: options.onChunk,
  });
  node.port.onmessage = (event: MessageEvent<unknown>): void => {
    if (event.data instanceof Float32Array) {
      chunker.push(event.data);
    }
  };
  let stopped = false;
  const stop = (): void => {
    if (stopped) {
      return;
    }
    stopped = true;
    node.port.onmessage = null;
    chunker.reset();
    source.disconnect();
    node.disconnect();
    mute.disconnect();
    stopTracks();
    context.close().catch(() => undefined);
  };
  const onEnded = (): void => {
    stop();
    options.onEnded();
  };
  for (const track of audioTracks) {
    track.addEventListener('ended', onEnded, { once: true });
  }
  return { stop };
}
