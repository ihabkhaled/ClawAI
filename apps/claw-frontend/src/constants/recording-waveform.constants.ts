// Live waveform visualization while recording — an AnalyserNode reading the
// SAME MediaStream MediaRecorder is capturing, downsampled into a fixed
// number of bars for RecordingWaveform to render as SVG rects.

/** How many bars the waveform renders. Matches a typical voice-message app. */
export const WAVEFORM_BAR_COUNT = 28;

/** AnalyserNode.fftSize — a small value keeps the per-frame downsample cheap. */
export const WAVEFORM_FFT_SIZE = 128;

/** Bars never fully collapse to zero height — a flat line reads as "frozen", not "quiet". */
export const WAVEFORM_MIN_BAR_LEVEL = 0.04;
