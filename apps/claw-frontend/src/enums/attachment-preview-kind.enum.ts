// How a sent message renders one attachment. Decided from mimeType +
// filename (getAttachmentPreviewKind), never from a raw `<img>` guess — that
// guess is what used to render a broken-image icon for every non-image file
// (voice notes, video notes, PDFs, everything) because it force-fed
// non-image bytes into an <img> tag.
export enum AttachmentPreviewKind {
  Image = 'image',
  Audio = 'audio',
  Video = 'video',
  Pdf = 'pdf',
  Text = 'text',
  Generic = 'generic',
}
