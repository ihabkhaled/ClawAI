// Transport used by the /api/contact route to deliver a contact message.
// NONE = disabled (the default): the route accepts + validates but delivers
// nowhere and reports "not configured". CONSOLE = structured, redacted log
// only (dev). SMTP = real delivery via nodemailer.
export enum ContactEmailProvider {
  NONE = 'none',
  CONSOLE = 'console',
  SMTP = 'smtp',
}
