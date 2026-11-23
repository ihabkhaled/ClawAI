import {
  LIVE_CAPTURE_CHUNK_SECONDS,
  LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS,
  LIVE_CAPTURE_MIC_CONSTRAINTS,
  LIVE_CAPTURE_PROCESSOR_NAME,
  LIVE_CAPTURE_SAMPLE_RATE,
  LIVE_CAPTURE_WORKLET_URL,
} from '@/constants/live.constants';
import { LiveCaptureError, LiveCaptureSource } from '@/enums/live.enum';
import type { LiveTabCaptureHandle, LiveTabCaptureOptions } from '@/types/live.types';

import { createLiveAudioChunker } from './live-audio.utility';
import { isLiveCaptureSupported, isLiveMicCaptureSupported } from './live-capture-state.utility';

/** Stops every track of a stream that gave no audio, then fails with NO_AUDIO. */
function audioTracksOrThrow(stream: MediaStream): MediaStreamTrack[] {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    throw new Error(LiveCaptureError.NO_AUDIO);
  }
  return audioTracks;
}

/** This tab's audio via getDisplayMedia; the video track is stopped at once (never sent). */
async function acquireTabAudio(): Promise<MediaStreamTrack[]> {
  if (!isLiveCaptureSupported()) {
    throw new Error(LiveCaptureError.UNSUPPORTED);
  }
  const stream = await navigator.mediaDevices.getDisplayMedia(LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS);
  for (const track of stream.getVideoTracks()) {
    track.stop();
  }
  return audioTracksOrThrow(stream);
}

/** The microphone, raw (echo cancellation off, or it would cancel the stream's own sound). */
async function acquireMicAudio(): Promise<MediaStreamTrack[]> {
  if (!isLiveMicCaptureSupported()) {
    throw new Error(LiveCaptureError.UNSUPPORTED);
  }
  const stream = await navigator.mediaDevices.getUserMedia(LIVE_CAPTURE_MIC_CONSTRAINTS);
  return audioTracksOrThrow(stream);
}

/**
 * Browser audio capture pipeline. Loaded with a dynamic `import()` by the capture hook only when the
 * viewer confirms, so none of it is in the live page bundle (rules/47).
 *
 * Audio tracks (this tab via getDisplayMedia, or the microphone via getUserMedia) → AudioContext →
 * AudioWorklet (same-origin module, mono frames) → 16 kHz PCM16 WAV chunks of 6 s → `onChunk`.
 * The worklet output feeds a muted gain so the graph keeps pulling; the tab's own sound is untouched.
 */
export async function startLiveTabCapture(
  options: LiveTabCaptureOptions,
): Promise<LiveTabCaptureHandle> {
  const audioTracks =
    options.source === LiveCaptureSource.MICROPHONE
      ? await acquireMicAudio()
      : await acquireTabAudio();
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
