// What a composer recording captures. String-literal unions are banned in this
// codebase, so the two recorder modes are an enum even though they are two.
export enum MediaRecordingKind {
  Audio = 'audio',
  Video = 'video',
}
