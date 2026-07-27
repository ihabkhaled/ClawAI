export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

export type EmailAttachment = {
  filename: string;
  content: Uint8Array;
  contentType: string;
};

export type EmailMessage = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  messageId?: string;
  attachments?: readonly EmailAttachment[];
};

export type EmailTransport = {
  send(message: EmailMessage): Promise<void>;
};
