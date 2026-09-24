// What a PDF/text/generic attachment card does once its lazily-fetched blob
// lands: open it (PDF, native viewer) or save it (everything else).
export enum AttachmentPendingAction {
  View = 'view',
  Download = 'download',
}
