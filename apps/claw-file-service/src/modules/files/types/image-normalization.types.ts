export type NormalizeImageInput = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export type NormalizedImageUpload = NormalizeImageInput & {
  /** True when the bytes were re-encoded; false when the input came back as it was. */
  converted: boolean;
};
