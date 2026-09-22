// Why a composer recording could not be produced. The hook never fails
// silently: every refusal lands here and the component turns it into a
// translated sentence, so a denied microphone reads as a denied microphone
// rather than as a dead button.
export enum MediaRecordingError {
  // No MediaRecorder / no navigator.mediaDevices.getUserMedia in this browser.
  Unsupported = 'unsupported',
  // getUserMedia rejected — denied permission, or no device at all.
  PermissionDenied = 'permission-denied',
  // The recorder emitted an error event mid-capture.
  RecorderFailed = 'recorder-failed',
  // Recorder stopped with zero bytes; uploading that would fail server-side.
  EmptyRecording = 'empty-recording',
}
