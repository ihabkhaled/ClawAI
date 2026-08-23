// Typed contract for the `feedback` section of the translation dictionary.
// Every key here is referenced from code; the i18n-key-references test fails
// if the two ever drift apart.

export type FeedbackLauncherTranslation = {
  ariaLabel: string;
  tooltip: string;
};

export type FeedbackDialogTranslation = {
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

export type FeedbackAdminTranslation = {
  title: string;
  searchLabel: string;
  searchPlaceholder: string;
  hasAttachments: string;
  updated: string;
  type: { all: string; placeholder: string };
  status: FeedbackAdminStatusTranslation;
  table: FeedbackAdminTableTranslation;
  actions: FeedbackAdminActionsTranslation;
  pagination: FeedbackAdminPaginationTranslation;
};

export type FeedbackTranslation = {
  launcher: FeedbackLauncherTranslation;
  dialog: FeedbackDialogTranslation;
  editor: FeedbackEditorTranslation;
  type: { placeholder: string };
  types: FeedbackTypeLabelsTranslation;
  errors: FeedbackErrorsTranslation;
  admin: FeedbackAdminTranslation;
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
