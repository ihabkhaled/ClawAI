// The in-chat password prompt for an ARCHIVE_ENCRYPTED attachment
// (useArchivePasswordPrompt). Wrong-vs-exceeded is decided by the server, not
// counted client-side: WrongPassword means "try again", AttemptsExceeded is
// terminal — no more input is offered.
export enum ArchivePasswordPromptStatus {
  Idle = 'idle',
  Submitting = 'submitting',
  WrongPassword = 'wrong-password',
  AttemptsExceeded = 'attempts-exceeded',
  Error = 'error',
}
