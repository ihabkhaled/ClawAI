// How a video's sampled frames reached a lane that received the
// VIDEO_FRAMES_AND_TRANSCRIPT strategy (multimodal batch 8). Recorded on the
// lane's `fileDelivery` entry beside the frame timestamps.
export enum VideoFrameDelivery {
  // The lane can see: each frame rode the payload as an image part,
  // labelled with its timestamp.
  NATIVE_IMAGES = 'NATIVE_IMAGES',
  // The lane cannot see: the VISION_HELPER role described each frame and the
  // lane received those descriptions as timestamped derived observations.
  HELPER_OBSERVATIONS = 'HELPER_OBSERVATIONS',
  // No frame reached the lane (frames endpoint failed, no helper, plan without
  // helper vision). The lane used the transcript only and was told so.
  NONE = 'NONE',
}
