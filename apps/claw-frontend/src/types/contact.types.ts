import type { UseFormReturn } from 'react-hook-form';

import type { ContactEmailProvider } from '@/enums/contact-email-provider.enum';
import type { ContactResponseCode } from '@/enums/contact-response-code.enum';
import type { ContactFormValues } from '@/lib/validation/contact.schema';

import type { TranslateFunction } from './i18n.types';

// A validated, already-sanitized contact submission ready to be delivered.
export type ContactMessage = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

// The rendered email produced from a ContactMessage.
export type ContactEmailPayload = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

// Provider-neutral delivery port. Every transport (console, SMTP, or a future
// HTTP provider) implements this. The route depends only on this interface.
export type ContactEmailTransport = {
  readonly provider: ContactEmailProvider;
  send(payload: ContactEmailPayload): Promise<void>;
};

// Resolved runtime configuration for the contact feature.
export type ContactConfig = {
  enabled: boolean;
  provider: ContactEmailProvider;
  fromAddress: string;
  toAddress: string;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  smtp: ContactSmtpConfig | null;
};

export type ContactSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

// Outcome codes the route returns to the client. Kept as a string enum-like
// union via an enum to satisfy the no-string-literal-union rule downstream.
export type ContactSubmitResponse = {
  ok: boolean;
  code: ContactResponseCode;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

// Client-facing result the hook maps to a toast/banner.
export type ContactFormResult = {
  code: ContactResponseCode;
};

// Internal outcome of processContactSubmission before it is mapped to an HTTP
// response.
export type ContactSubmissionOutcome = {
  code: ContactResponseCode;
  httpStatus: number;
  retryAfterSeconds: number;
};

// Contract between the contact controller hook and its view.
export type UseContactFormReturn = {
  form: UseFormReturn<ContactFormValues>;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
  isSuccess: boolean;
  errorCode: ContactResponseCode | null;
  resetSuccess: () => void;
  t: TranslateFunction;
};
