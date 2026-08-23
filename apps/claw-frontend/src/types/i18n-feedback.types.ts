export type FeedbackLauncherTranslation = {
  ariaLabel: string;
  tooltip: string;
};

export type FeedbackDialogTranslation = {
  title: string;
  description: string;
  typeLabel: string;
  titleLabel: string;
  titlePlaceholder: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  contentLabel: string;
  contentPlaceholder: string;
  attachmentsLabel: string;
  dropHint: string;
  pasteHint: string;
  removeAttachment: string;
  screenshotLabel: string;
  captureScreenshot: string;
  removeScreenshot: string;
  screenshotFailed: string;
  preview: string;
  write: string;
  cancel: string;
  submit: string;
  submitting: string;
};

export type FeedbackToolbarTranslation = {
  bold: string;
  italic: string;
  bulletList: string;
  numberedList: string;
  heading: string;
  link: string;
  code: string;
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

export type FeedbackStatusLabelsTranslation = {
  open: string;
  inProgress: string;
  resolved: string;
  closed: string;
  archived: string;
  all: string;
};

export type FeedbackErrorsTranslation = {
  titleRequired: string;
  contentRequired: string;
  typeRequired: string;
  tooManyFiles: string;
  fileTooLarge: string;
  totalTooLarge: string;
  unsupportedType: string;
  uploadFailed: string;
  submitFailed: string;
};

export type FeedbackAdminColumnsTranslation = {
  ticket: string;
  type: string;
  title: string;
  reporter: string;
  status: string;
  created: string;
  updated: string;
  attachments: string;
};

export type FeedbackAdminDetailTranslation = {
  title: string;
  reporter: string;
  page: string;
  device: string;
  description: string;
  attachments: string;
  history: string;
  resolvedAt: string;
  closedAt: string;
  noResults: string;
};

export type FeedbackAdminActionsTranslation = {
  markInProgress: string;
  resolve: string;
  close: string;
  reopen: string;
  archive: string;
  confirmArchive: string;
  viewImage: string;
  closeImage: string;
};

export type FeedbackAdminPaginationTranslation = {
  previous: string;
  next: string;
  pageOf: string;
};

export type FeedbackAdminTranslation = {
  title: string;
  description: string;
  searchLabel: string;
  searchPlaceholder: string;
  typeFilterAll: string;
  columns: FeedbackAdminColumnsTranslation;
  detail: FeedbackAdminDetailTranslation;
  actions: FeedbackAdminActionsTranslation;
  pagination: FeedbackAdminPaginationTranslation;
};

export type FeedbackTranslation = {
  launcher: FeedbackLauncherTranslation;
  dialog: FeedbackDialogTranslation;
  toolbar: FeedbackToolbarTranslation;
  types: FeedbackTypeLabelsTranslation;
  status: FeedbackStatusLabelsTranslation;
  errors: FeedbackErrorsTranslation;
  submittedWithTicket: string;
  admin: FeedbackAdminTranslation;
};
