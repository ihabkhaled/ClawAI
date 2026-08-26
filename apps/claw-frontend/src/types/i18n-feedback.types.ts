// Typed contract for the `feedback` section of the translation dictionary.
// Every key here is referenced from code; the i18n-key-references test fails
// if the two ever drift apart.

export type FeedbackLauncherTranslation = {
  ariaLabel: string;
  tooltip: string;
};

export type FeedbackDialogTranslation = {
  typeLabel: string;
  title: string;
  description: string;
  titleLabel: string;
  titlePlaceholder: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  cancel: string;
  submit: string;
  submitting: string;
};

export type FeedbackEditorTranslation = {
  bold: string;
  italic: string;
  bulletList: string;
  numberedList: string;
  heading: string;
  link: string;
  inlineCode: string;
  write: string;
  preview: string;
};

export type FeedbackTypeLabelsTranslation = {
  bugReport: string;
  generalFeedback: string;
  featureRequest: string;
  uiUx: string;
  performance: string;
  dataIssue: string;
  integrationIssue: string;
  documentation: string;
  securityConcern: string;
  other: string;
};

export type FeedbackErrorsTranslation = {
  typeRequired: string;
  titleRequired: string;
  contentRequired: string;
  submitFailed: string;
  tooManyFiles: string;
  fileTooLarge: string;
  totalTooLarge: string;
  unsupportedType: string;
  uploadFailed: string;
};

export type FeedbackAdminStatusTranslation = {
  all: string;
  open: string;
  inProgress: string;
  resolved: string;
  closed: string;
  archived: string;
};

export type FeedbackAdminTableTranslation = {
  ticket: string;
  type: string;
  title: string;
  reporter: string;
  status: string;
  created: string;
  updated: string;
  attachments: string;
};

export type FeedbackAdminActionsTranslation = {
  markInProgress: string;
  resolve: string;
  close: string;
  reopen: string;
  archive: string;
  confirmArchive: string;
};

export type FeedbackAdminPaginationTranslation = {
  previous: string;
  next: string;
  pageOf: string;
};

export type FeedbackAdminDetailTranslation = {
  imageDimensions: string;
  imageUnavailable: string;
  openOriginal: string;
  imageLoading: string;
  ticket: string;
  reporter: string;
  created: string;
  updated: string;
  resolved: string;
  closed: string;
  context: string;
  route: string;
  url: string;
  viewport: string;
  appVersion: string;
  userAgent: string;
  locale: string;
  description: string;
  attachments: string;
  history: string;
  notAvailable: string;
  imagePreview: string;
};

export type FeedbackAdminTranslation = {
  title: string;
  searchLabel: string;
  searchPlaceholder: string;
  hasAttachments: string;
  updated: string;
  type: { all: string; placeholder: string };
  status: FeedbackAdminStatusTranslation;
  detail: FeedbackAdminDetailTranslation;
  table: FeedbackAdminTableTranslation;
  actions: FeedbackAdminActionsTranslation;
  pagination: FeedbackAdminPaginationTranslation;
};

export type FeedbackScreenshotTranslation = {
  failed: string;
  unsupported: string;
};

export type FeedbackTranslation = {
  launcher: FeedbackLauncherTranslation;
  dialog: FeedbackDialogTranslation;
  editor: FeedbackEditorTranslation;
  type: { placeholder: string };
  types: FeedbackTypeLabelsTranslation;
  errors: FeedbackErrorsTranslation;
  admin: FeedbackAdminTranslation;
  screenshot: FeedbackScreenshotTranslation;
  captureScreenshot: string;
  capturing: string;
  screenshotPreview: string;
  removeScreenshot: string;
  pasteOrUploadInstead: string;
  uploadAttachments: string;
  dragDropOrClickToUpload: string;
  removeAttachment: string;
  submittedWithTicket: string;
};
