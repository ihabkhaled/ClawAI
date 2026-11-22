/*
 * Live Intelligence tab-audio capture (batch 2). Served same-origin from /worklets/ and loaded with
 * audioWorklet.addModule by src/utilities/live-capture.utility.ts. Plain JS: it is not bundled.
 *
 * Mixes every input channel down to mono and posts Float32Array batches of BATCH_SAMPLES to the main
 * thread (one message per ~85 ms at 48 kHz instead of one per 128-sample render quantum). The main
 * thread downsamples to 16 kHz and encodes the WAV chunks.
 */
const BATCH_SAMPLES = 4096;

class LiveCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batch = new Float32Array(BATCH_SAMPLES);
    this.filled = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0 || !input[0]) {
      return true;
    }
    const channels = input.length;
    const frames = input[0].length;
    for (let index = 0; index < frames; index += 1) {
      let sum = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        sum += input[channel][index];
      }
      this.batch[this.filled] = sum / channels;
      this.filled += 1;
      if (this.filled === BATCH_SAMPLES) {
        this.port.postMessage(this.batch, [this.batch.buffer]);
        this.batch = new Float32Array(BATCH_SAMPLES);
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor('live-capture-processor', LiveCaptureProcessor);
