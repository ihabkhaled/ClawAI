/** A file whose text did not fit the answering model's window, with its WHOLE text (ADR-231). */
export type OversizedFile = {
  fileId: string;
  filename: string;
  text: string;
};
